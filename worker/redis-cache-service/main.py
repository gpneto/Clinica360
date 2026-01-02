"""
Redis Cache Service - Mantém conexão Redis sempre aberta
Expõe API REST para operações de cache
"""
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import redis
import json
import os
import logging
from contextlib import asynccontextmanager

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração do Redis
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', '6379'))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')
REDIS_DB = int(os.getenv('REDIS_DB', '1'))

# Autenticação
API_KEY = os.getenv('REDIS_SERVICE_API_KEY', 'SmartDoctorRedisService2024!Secure')

# Cliente Redis global (mantém conexão sempre aberta)
redis_client: Optional[redis.Redis] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação"""
    global redis_client
    
    # Inicializar conexão Redis ao iniciar
    logger.info(f"Conectando ao Redis: {REDIS_HOST}:{REDIS_PORT} (DB: {REDIS_DB})")
    try:
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD if REDIS_PASSWORD else None,
            db=REDIS_DB,
            socket_connect_timeout=5,
            socket_timeout=5,
            decode_responses=True,
            health_check_interval=30,  # Verificar saúde da conexão a cada 30s
            retry_on_timeout=True,
        )
        # Testar conexão
        redis_client.ping()
        logger.info("✅ Redis conectado com sucesso!")
    except Exception as e:
        logger.error(f"❌ Erro ao conectar ao Redis: {e}")
        redis_client = None
    
    yield
    
    # Fechar conexão ao encerrar
    if redis_client:
        logger.info("Fechando conexão Redis...")
        redis_client.close()

app = FastAPI(
    title="Redis Cache Service",
    description="Serviço intermediário para cache Redis com conexão persistente",
    version="1.0.0",
    lifespan=lifespan
)

def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Verifica a chave de API no header"""
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="API Key inválida ou ausente")
    return x_api_key

class GetCacheRequest(BaseModel):
    key: str

class SetCacheRequest(BaseModel):
    key: str
    value: dict
    ttl: Optional[int] = None  # None = sem expiração (cache permanente)

class DeleteCacheRequest(BaseModel):
    key: str

@app.get("/health")
async def health_check():
    """Endpoint de health check"""
    if redis_client is None:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "message": "Redis não conectado"}
        )
    
    try:
        redis_client.ping()
        return {"status": "healthy", "redis": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "message": str(e)}
        )

@app.post("/cache/get")
async def get_cache(
    request: GetCacheRequest,
    x_api_key: str = Header(..., alias="X-API-Key")
):
    """Obtém um valor do cache"""
    verify_api_key(x_api_key)
    
    if redis_client is None:
        raise HTTPException(status_code=503, detail="Redis não conectado")
    
    try:
        cache_key = f"cache:{request.key}"
        value = redis_client.get(cache_key)
        
        if value is None:
            return {"found": False, "value": None}
        
        return {"found": True, "value": json.loads(value)}
    except redis.RedisError as e:
        logger.error(f"Erro ao obter cache: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao acessar Redis: {str(e)}")
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao decodificar JSON: {e}")
        raise HTTPException(status_code=500, detail="Erro ao decodificar valor do cache")

@app.post("/cache/set")
async def set_cache(
    request: SetCacheRequest,
    x_api_key: str = Header(..., alias="X-API-Key")
):
    """Define um valor no cache"""
    verify_api_key(x_api_key)
    
    if redis_client is None:
        raise HTTPException(status_code=503, detail="Redis não conectado")
    
    try:
        cache_key = f"cache:{request.key}"
        serialized = json.dumps(request.value)
        
        # Se TTL for None ou 0, salvar sem expiração (cache permanente)
        if request.ttl is not None and request.ttl > 0:
            redis_client.setex(cache_key, request.ttl, serialized)
            ttl_info = request.ttl
        else:
            redis_client.set(cache_key, serialized)
            ttl_info = None  # Sem expiração
        
        return {"success": True, "key": request.key, "ttl": ttl_info}
    except redis.RedisError as e:
        logger.error(f"Erro ao definir cache: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao acessar Redis: {str(e)}")

@app.post("/cache/delete")
async def delete_cache(
    request: DeleteCacheRequest,
    x_api_key: str = Header(..., alias="X-API-Key")
):
    """Remove uma chave do cache"""
    verify_api_key(x_api_key)
    
    if redis_client is None:
        raise HTTPException(status_code=503, detail="Redis não conectado")
    
    try:
        cache_key = f"cache:{request.key}"
        deleted = redis_client.delete(cache_key)
        
        return {"success": True, "deleted": deleted > 0}
    except redis.RedisError as e:
        logger.error(f"Erro ao deletar cache: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao acessar Redis: {str(e)}")

@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "service": "Redis Cache Service",
        "version": "1.0.0",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv('PORT', '8080'))
    uvicorn.run(app, host="0.0.0.0", port=port)


