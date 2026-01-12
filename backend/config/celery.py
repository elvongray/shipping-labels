import os

import structlog
from celery import Celery
from celery.signals import task_postrun, task_prerun
from django.conf import settings

from core.logging import configure_structlog

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

configure_structlog(settings.DEBUG)
logger = structlog.get_logger(__name__)


@task_prerun.connect
def _task_prerun(task_id, task, _, kwargs, **_extras):
    structlog.contextvars.bind_contextvars(task_id=task_id, task_name=task.name)
    import_job_id = kwargs.get("import_job_id")
    if import_job_id:
        structlog.contextvars.bind_contextvars(import_job_id=str(import_job_id))
    logger.info("celery.task.started")


@task_postrun.connect
def _task_postrun():
    logger.info("celery.task.completed")
    structlog.contextvars.clear_contextvars()
