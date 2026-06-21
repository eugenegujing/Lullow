from app.integrations import vector_store

def main():
    vector_store.seed_document_from_text("doc_stars", "A cozy bedtime story about stars and the moon.")
    vector_store.seed_document_from_text("doc_monster", "A scary monster story with loud noises and thunder.")
    print("INDEX_MEMBERS:", vector_store.get_document("doc_stars") is not None)
    from app.integrations.redis_app_client import app_redis_client
    print("INDEX MEMBERS LIST:", app_redis_client.index_members("vectors"))

if __name__ == "__main__":
    main()
