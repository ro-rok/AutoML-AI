# app/routes/aniexplorer.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os, pickle, numpy as np, httpx
from dotenv import load_dotenv

load_dotenv()
MAL_CLIENT_ID = os.getenv("MAL_CLIENT_ID", "")
if not MAL_CLIENT_ID:
    raise RuntimeError("MAL_CLIENT_ID not set in env")

router = APIRouter()

with open("automl-ai-backend/src/id_weights.pkl", "rb") as f:
    id_weights = pickle.load(f)
anime_ids = list(id_weights.keys())

class FindSimilarReq(BaseModel):
    anime_name: str
    media_type: str

@router.get("/")
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
    dists = np.dot(list(id_weights.values()), vec)
    idxs = np.argsort(dists)[-11:]  # top 11 so we can drop the first
    sims = sorted(
      [
        {"anime_details": await get_anime_details(anime_ids[i]), "similarity": float(dists[i])}
        for i in idxs
      ],
      key=lambda x: x["similarity"],
      reverse=True
    )
    return {
      "anime_searched": sims[0],
      "similar_animes": sims[1:],
    }
