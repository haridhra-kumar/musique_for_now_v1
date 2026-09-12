import ssl

from celery import Celery

from app.config import get_settings

settings = get_settings()

broker_url = settings.effective_celery_broker_url
result_backend = settings.effective_celery_result_backend

celery_app = Celery(
    "audiocoach",
    broker=broker_url,
    backend=result_backend,
    include=["tasks.analyze_task"],
)

conf = {
    "task_serializer": "json",
    "accept_content": ["json"],
    "result_serializer": "json",
    "timezone": "UTC",
    "enable_utc": True,
    "task_track_started": True,
    "task_acks_late": True,
    "worker_prefetch_multiplier": 1,
    "task_soft_time_limit": 300,  # 5 minutes
    "task_time_limit": 360,       # 6 minutes hard limit
    "broker_connection_retry_on_startup": True,
}

if broker_url.startswith("rediss://"):
    conf["broker_use_ssl"] = {
        "ssl_cert_reqs": ssl.CERT_NONE,
    }
    conf["broker_transport_options"] = {
        "health_check_interval": 20,
        "socket_keepalive": True,
        "retry_on_timeout": True,
    }

if result_backend and result_backend.startswith("rediss://"):
    conf["redis_backend_use_ssl"] = {
        "ssl_cert_reqs": ssl.CERT_NONE,
    }

celery_app.conf.update(conf)

