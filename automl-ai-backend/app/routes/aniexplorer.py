# app/routes/aniexplorer.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os, pickle, numpy as np, httpx, asyncio
from pathlib import Path
from dotenv import load_dotenv

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
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers={"X-MAL-CLIENT-ID": MAL_CLIENT_ID})
    if r.status_code != 200:
        raise HTTPException(502, "MAL detail fetch failed")
    return r.json()

@router.post("/find_similar")
async def find_similar(req: FindSimilarReq):
    # 1) search MAL for ID
    search_url = (
      f"https://api.myanimelist.net/v2/anime?"
      f"q={req.anime_name}&limit=10&fields=media_type,id"
    )
    async with httpx.AsyncClient() as client:
        r = await client.get(search_url, headers={"X-MAL-CLIENT-ID": MAL_CLIENT_ID})
    if r.status_code != 200:
        raise HTTPException(502, "MAL search failed")
    data = r.json().get("data", [])
    if not data:
        raise HTTPException(404, "Anime not found")
    # pick by media_type
    mal_id = next(
      (node["node"]["id"] for node in data
       if node["node"]["media_type"].lower()==req.media_type.lower()),
      data[0]["node"]["id"]
    )

    # 2) compute similarity
    vec = id_weights.get(mal_id)
    if vec is None:
        raise HTTPException(404, "Not in model")
    
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
