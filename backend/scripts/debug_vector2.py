from app.integrations import vector_store
from app.integrations.embedding_client import embedding_client
from app.integrations.redis_app_client import app_redis_client

def cosine(a,b):
    import math
    if not a or not b or len(a)!=len(b):
        return 0.0
    dot = sum(x*y for x,y in zip(a,b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(y*y for y in b))
    if na==0 or nb==0: return 0.0
    return dot/(na*nb)

def main():
    app_redis_client.delete("vectors")
    vector_store.seed_document_from_text("doc_stars", "A cozy bedtime story about stars and the moon.")
    vector_store.seed_document_from_text("doc_monster", "A scary monster story with loud noises and thunder.")
    q_emb = embedding_client.embed_text("bedtime stars moon")
    s_emb = vector_store.get_document("doc_stars")["embedding"]
    m_emb = vector_store.get_document("doc_monster")["embedding"]
    print("q_len", len(q_emb), "s_len", len(s_emb), "m_len", len(m_emb))
    print("q-s cosine", cosine(q_emb,s_emb))
    print("q-m cosine", cosine(q_emb,m_emb))
    print("search results", vector_store.search("bedtime stars moon", top_k=2, min_score=0.0))

if __name__=="__main__":
    main()
