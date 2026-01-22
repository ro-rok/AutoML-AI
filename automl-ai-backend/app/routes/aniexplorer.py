# app/routes/aniexplorer.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os, pickle, numpy as np, httpx, asyncio, logging
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()
MAL_CLIENT_ID = os.getenv("MAL_CLIENT_ID", "")
if not MAL_CLIENT_ID:
    raise RuntimeError("MAL_CLIENT_ID not set in env")

router = APIRouter()

# Fix path to be relative to project root
pkl_path = Path(__file__).parent.parent.parent / "src" / "id_weights.pkl"
try:
    with open(pkl_path, "rb") as f:
        id_weights = pickle.load(f)
    anime_ids = list(id_weights.keys())
except FileNotFoundError:
    raise RuntimeError(f"id_weights.pkl not found at {pkl_path}")
except Exception as e:
    raise RuntimeError(f"Failed to load id_weights.pkl: {e}")

class FindSimilarReq(BaseModel):
    anime_name: str
    media_type: str

@router.get("/")
@router.head("/")
async def hello():
    return {"message": "AniExplorer service alive"}

async def get_anime_details(anime_id: int):
    url = (
      f"https://api.myanimelist.net/v2/anime/{anime_id}"
      "?fields=id,title,main_picture,alternative_titles,"
      "start_date,end_date,synopsis,mean,rank,popularity,"
      "status,genres,my_list_status,num_episodes,"
      "start_season,rating,pictures,background,media_type"
    )
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers={"X-MAL-CLIENT-ID": MAL_CLIENT_ID}, timeout=30.0)
        if r.status_code != 200:
            error_msg = f"MAL detail fetch failed for anime_id {anime_id}: {r.status_code}"
            try:
                error_detail = r.json()
                error_msg += f" - {error_detail}"
            except:
                error_msg += f" - {r.text[:200]}"
            logger.error(error_msg)
            raise HTTPException(502, error_msg)
        return r.json()
    except httpx.TimeoutException:
        error_msg = f"MAL detail fetch timeout for anime_id {anime_id}"
        logger.error(error_msg)
        raise HTTPException(502, error_msg)
    except Exception as e:
        error_msg = f"MAL detail fetch error for anime_id {anime_id}: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(502, error_msg)

@router.post("/find_similar")
async def find_similar(req: FindSimilarReq):
    logger.info(f"Searching for anime: {req.anime_name}, media_type: {req.media_type}")
    # 1) search MAL for ID
    search_url = (
      f"https://api.myanimelist.net/v2/anime?"
      f"q={req.anime_name}&limit=10"
    )
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(search_url, headers={"X-MAL-CLIENT-ID": MAL_CLIENT_ID}, timeout=30.0)
        if r.status_code != 200:
            error_msg = f"MAL search failed: {r.status_code}"
            if r.status_code == 400:
                try:
                    error_detail = r.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {r.text[:200]}"
            logger.error(f"Search error for '{req.anime_name}': {error_msg}")
            raise HTTPException(502, error_msg)
    except httpx.TimeoutException:
        error_msg = f"MAL search timeout for '{req.anime_name}'"
        logger.error(error_msg)
        raise HTTPException(502, error_msg)
    except Exception as e:
        error_msg = f"MAL search error for '{req.anime_name}': {str(e)}"
        logger.error(error_msg)
        raise HTTPException(502, error_msg)
    data = r.json().get("data", [])
    if not data:
        raise HTTPException(404, "Anime not found")
    
    # Check if media_type is in the search response, if not fetch details
    mal_id = None
    for node in data:
        node_data = node.get("node", {})
        if "media_type" in node_data:
            if node_data["media_type"].lower() == req.media_type.lower():
                mal_id = node_data["id"]
                break
    
    # If media_type not in search results or no match found, fetch details for candidates
    if mal_id is None:
        # Fetch details for first few results to find matching media_type
        candidate_ids = [node.get("node", {}).get("id") for node in data[:5] if node.get("node", {}).get("id")]
        if not candidate_ids:
            raise HTTPException(404, "No valid anime IDs found in search results")
        
        # Fetch details concurrently for candidates
        detail_tasks = [get_anime_details(anime_id) for anime_id in candidate_ids]
        detail_results = await asyncio.gather(*detail_tasks, return_exceptions=True)
        
        # Find first match by media_type
        for details in detail_results:
            if isinstance(details, Exception):
                continue
            if details.get("media_type", "").lower() == req.media_type.lower():
                mal_id = details.get("id")
                break
        
        # If still no match, use first result
        if mal_id is None:
            mal_id = candidate_ids[0]

    # 2) compute similarity
    logger.info(f"Computing similarity for anime_id: {mal_id}")
    vec = id_weights.get(mal_id)
    if vec is None:
        logger.warning(f"Anime ID {mal_id} not found in model")
        raise HTTPException(404, f"Anime ID {mal_id} not in model")
    
    # Convert to numpy array for efficient computation
    weight_matrix = np.array(list(id_weights.values()))
    dists = np.dot(weight_matrix, vec)
    idxs = np.argsort(dists)[-11:][::-1]  # top 11, descending order
    
    # Fetch details concurrently instead of sequentially
    tasks = [get_anime_details(anime_ids[i]) for i in idxs]
    details_list = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Build results, filtering out any failed fetches
    sims = []
    for i, details in zip(idxs, details_list):
        if isinstance(details, Exception):
            continue  # Skip failed fetches
        sims.append({
            "anime_details": details,
            "similarity": float(dists[i])
        })
    
    if not sims:
        raise HTTPException(502, "Failed to fetch anime details")
    
    return {
      "anime_searched": sims[0],
      "similar_animes": sims[1:],
    }
