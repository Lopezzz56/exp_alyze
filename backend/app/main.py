from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import upload, transactions, analytics, insights, market

app = FastAPI(
    title="ExpAlyze Financial Parsing & Analytics API",
    description="Backend microservice for PDF statements parsing, arithmetic audits, and AI-driven insights.",
    version="1.0.0"
)

# Configure CORS so our Next.js frontend can make API requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(upload.router, prefix="/api/v1/upload", tags=["Upload Ingestion"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["Transactions Ledger"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Dashboard Analytics"])
app.include_router(insights.router, prefix="/api/v1/insights", tags=["AI Insights"])
app.include_router(market.router, prefix="/api/v1/market", tags=["Market Intelligence"])

@app.get("/")
def read_root():
    return {"status": "ONLINE", "message": "ExpAlyze Backend API is running successfully."}
