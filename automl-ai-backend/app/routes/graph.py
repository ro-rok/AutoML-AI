# automl-ai-backend/app/routes/graph.py

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from ..utils.graph_utils import *
from .upload import session_store

router = APIRouter()

def _get_df(session_id: str):
    if session_id not in session_store:
        raise HTTPException(404, "Invalid session_id")
    return session_store[session_id]["data"]

@router.get("/histogram")
async def histogram(
    session_id: str,
    column: Optional[str] = Query(None),
    bins: int = Query(30, ge=1),
):
    df = _get_df(session_id)
    buf = plot_histogram(df, column=column, bins=bins)
    return StreamingResponse(buf, media_type="image/png")

@router.get("/bar")
async def bar_chart(session_id: str, column: str = Query(...)):
    df = _get_df(session_id)
    buf = plot_bar(df, column)
    return StreamingResponse(buf, media_type="image/png")

@router.get("/pie")
async def pie_chart(session_id: str, column: str = Query(...)):
    df = _get_df(session_id)
    buf = plot_pie(df, column)
    return StreamingResponse(buf, media_type="image/png")

@router.get("/boxplot")
async def boxplot(session_id: str, column: Optional[str] = Query(None)):
    df = _get_df(session_id)
    buf = plot_boxplot(df, column)
    return StreamingResponse(buf, media_type="image/png")

@router.get("/qq")
async def qqplot(session_id: str, column: str = Query(...)):
    df = _get_df(session_id)
    buf = plot_qq(df, column)
    return StreamingResponse(buf, media_type="image/png")

@router.get("/scatter")
async def scatter(
    session_id: str,
    x: str = Query(...),
    y: str = Query(...),
):
    df = _get_df(session_id)
    buf = plot_scatter(df, x, y)
    return StreamingResponse(buf, media_type="image/png")

@router.get("/line")
async def line_plot(
    session_id: str,
    x: str = Query(...),
    y: str = Query(...),
):
    df = _get_df(session_id)
    buf = plot_line(df, x, y)
    return StreamingResponse(buf, media_type="image/png")

@router.get("/heatmap")
async def heatmap(session_id: str):
    df = _get_df(session_id)
    buf = plot_heatmap(df)
    return StreamingResponse(buf, media_type="image/png")

@router.get("/roc_plot")
async def roc_plot(session_id: str):
    if session_id not in session_store or "train" not in session_store[session_id]["meta"]["steps"]:
        raise HTTPException(404, "No recent training results for ROC")
    df_test = session_store[session_id]["meta"]["steps"]["train"][-1]["test"]
    if df_test is None or "__y_true" not in df_test or "__y_score" not in df_test:
        raise HTTPException(404, "No test data available for ROC")
    if df_test["__y_true"].nunique() != 2:
        raise HTTPException(400, "ROC plot is only available for binary classification")
    if df_test["__y_true"].isnull().any() or df_test["__y_score"].isnull().any():
        raise HTTPException(400, "ROC plot requires non-null values in __y_true and __y_score")
    buf = plot_roc_curve(df_test["__y_true"], df_test["__y_score"], roc_auc=session_store[session_id]["meta"]["steps"]["train"][-1]["metrics"]["roc_auc"])
    return StreamingResponse(buf, media_type="image/png")

@router.get("/compare-models")
async def compare_models(session_id: str):
    train_steps = session_store[session_id]["meta"]["steps"].get("train", [])
    metrics = { step["model"]: step["metrics"] for step in train_steps }
    print("metrics")
    print(metrics)
    buf = plot_model_comparison(metrics)
    return StreamingResponse(buf, media_type="image/png")

@router.get("/shap-summary")
async def shap_summary(session_id: str, model: str):
    
    shap_values = session_store[session_id]["meta"]["steps"]["explain"][model]["shap_values"]
    X_test = session_store[session_id]["meta"]["steps"]["explain"][model]["X"]

    if model is None:
        raise HTTPException(404, "Model not found")
    
    buf = plot_shap_summary(shap_values, X_test)
    return StreamingResponse(buf, media_type="image/png")
