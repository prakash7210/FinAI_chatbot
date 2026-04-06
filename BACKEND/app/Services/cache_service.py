cache_store = {}


def cache_get(key):
    return cache_store.get(key)


def cache_set(key, value):
    cache_store[key] = value