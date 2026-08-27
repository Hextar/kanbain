from redis import Redis
from rq import Worker

from . import create_app
from .queue import QUEUE_NAME


def main() -> None:
    app = create_app()

    class AppWorker(Worker):
        def execute_job(self, job, queue):
            with app.app_context():
                return super().execute_job(job, queue)

    connection = Redis.from_url(app.config["REDIS_URL"])
    AppWorker([QUEUE_NAME], connection=connection).work()


if __name__ == "__main__":
    main()
