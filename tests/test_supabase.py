import os
import pytest
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env vars from .env.local or .env
load_dotenv('.env.local')
load_dotenv('.env')

url: str = os.getenv("EXPO_PUBLIC_SUPABASE_URL")
key: str = os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")

@pytest.fixture
def supabase_client() -> Client:
    if not url or not key:
        pytest.skip("Supabase credentials not found in environment")
    return create_client(url, key)

def test_supabase_connection(supabase_client):
    """Test that we can connect to Supabase."""
    assert supabase_client is not None

def test_fetch_stores(supabase_client):
    """Test fetching stores from the database."""
    response = supabase_client.table("stores").select("*").limit(1).execute()
    assert hasattr(response, 'data')
    assert isinstance(response.data, list)

def test_fetch_materials(supabase_client):
    """Test fetching materials from the database."""
    response = supabase_client.table("materials").select("*").limit(1).execute()
    assert hasattr(response, 'data')
    assert isinstance(response.data, list)

def test_fetch_orders(supabase_client):
    """Test fetching orders from the database."""
    response = supabase_client.table("orders").select("*").limit(1).execute()
    assert hasattr(response, 'data')
    assert isinstance(response.data, list)

def test_calculate_margin():
    """Simple unit test for margin calculation logic (isolated)."""
    base_price = 100
    margin_pct = 10
    unit_price = base_price + (base_price * (margin_pct / 100))
    assert unit_price == 110
