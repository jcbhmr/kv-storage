type KVStorageAreaBackingStore<N extends string> = {
  database: `kv-storage:${N}`;
  store: "store";
  version: 1;
};

const DatabaseName = new WeakMap<KVStorageArea, `kv-storage:${string}`>();
const DatabasePromise = new WeakMap<
  KVStorageArea,
  Promise<IDBDatabase> | null
>();
const BackingStoreObject = new WeakMap<
  KVStorageArea,
  KVStorageAreaBackingStore<N> | null
>();

class KVStorageArea<K = any, V = any, N extends string> {
  /**
Creates a new KVStorageArea that provides an async key/value store view onto an IndexedDB database named `kv-storage:${name}`.

This does not actually open or create the database yet; that is done lazily when other methods are called. This means that all other methods can reject with database-related exceptions in failure cases.
   */
  constructor(name: N) {
    // 1. Set this.[[DatabaseName]] to the concatenation of "kv-storage:" and name.
    DatabaseName.set(this, "kv-storage:" + name);

    // 2. Set this.[[DatabasePromise]] to null.
    DatabasePromise.set(this, null);

    // 3. Set this.[[BackingStoreObject]] to null.
    BackingStoreObject.set(this, null);
  }

  /**
Asynchronously stores the given value so that it can later be retrieved by the given key.

Keys have to follow the same restrictions as IndexedDB keys: roughly, a key can be a number, string, array, Date, ArrayBuffer, DataView, typed array, or an array of these. Invalid keys will cause the returned promise to reject with a "DataError" DOMException.

Values can be any value that can be structured-serialized for storage. Un-serializable values will cause a "DataCloneError" DOMException. The value undefined will cause the corresponding entry to be deleted.

The returned promise will fulfill with undefined on success.
   */
  set(key: K, value: V): Promise<void> {
    // 1. If key is not allowed as a key, return a promise rejected with a "DataError" DOMException.

    // 2. Return the result of performing a database operation given this object, "readwrite", and the following steps operating on transaction and store:
    return performingADatabaseOperation(
      this,
      "readwrite",
      (transaction, store) => {
        // 1. If value is undefined, then
        if (value === undefined) {
          // 1. Perform the steps listed in the description of IDBObjectStore's delete() method on store, given the argument key.
          store.delete(key);
        }

        // 2. Otherwise,
        else {
          // 1. Perform the steps listed in the description of IDBObjectStore's put() method on store, given the arguments value and key.
          store.put(value, key);
        }

        // 3. Let promise be a new promise in the relevant Realm of this.
        // 7. Return promise.
        return new Promise((resolve, reject) => {
          // 4. Add a simple event listener to transaction for "complete" that resolves promise with undefined.
          addASimpleEventListener(transaction, "complete", () => resolve());

          // 5. Add a simple event listener to transaction for "error" that rejects promise with transaction’s error.
          addASimpleEventListener(transaction, "error", () =>
            reject(transaction.error)
          );

          // 6. Add a simple event listener to transaction for "abort" that rejects promise with transaction’s error.
          addASimpleEventListener(transaction, "abort", () =>
            reject(transaction.error)
          );
        });
      }
    );
  }

  /**
Asynchronously retrieves the value stored at the given key, or undefined if there is no value stored at key.

Values retrieved will be structured-deserialized from their original form.
   */
  get(key: K): Promise<V | undefined> {
    // 1. If key is not allowed as a key, return a promise rejected with a "DataError" DOMException.
    if (!allowedAsAKey(key)) {
      return Promise.reject(
        new DOMException("TODO: Figure out a good error message", "DataError")
      );
    }

    // 2. Return the result of performing a database operation given this object, "readonly", and the following steps operating on transaction and store:
    return performingADatabaseOperation(
      this,
      "readonly",
      (transaction, store) => {
        // 1. Let request be the result of performing the steps listed in the description of IDBObjectStore's get() method on store, given the argument key.
        const request = store.get(key);

        // 2. Let promise be a new promise in the relevant Realm of this.
        // 5. Return promise.
        return new Promise((resolve, reject) => {
          // 3. Add a simple event listener to request for "success" that resolves promise with request’s result.
          addASimpleEventListener(request, "success", () =>
            resolve(request.result)
          );

          // 4. Add a simple event listener to request for "error" that rejects promise with request’s error.
          addASimpleEventListener(request, "error", () =>
            reject(request.error)
          );
        });
      }
    );
  }

  /**
Asynchronously deletes the entry at the given key. This is equivalent to storage.set(key, undefined).

The returned promise will fulfill with undefined on success.
   */
  delete(key: K): Promise<void> {
    // 1. If key is not allowed as a key, return a promise rejected with a "DataError" DOMException.
    if (!allowedAsAKey(key)) {
      return Promise.reject(
        new DOMException("TODO: Come up with a good error message", "DataError")
      );
    }

    // 2. Return the result of performing a database operation given this object, "readwrite", and the following steps operating on transaction and store:
    return performingADatabaseOperation(
      this,
      "readwrite",
      (transaction, store) => {
        // 1. Perform the steps listed in the description of IDBObjectStore's delete() method on store, given the argument key.
        store.delete(key);

        // 2. Let promise be a new promise in the relevant Realm of this.
        // 6. Return promise.
        return new Promise((resolve, reject) => {
          // 3. Add a simple event listener to transaction for "complete" that resolves promise with undefined.
          addASimpleEventListener(transaction, "complete", () => resolve());

          // 4. Add a simple event listener to transaction for "error" that rejects promise with transaction’s error.
          addASimpleEventListener(transaction, "error", () =>
            reject(transaction.error)
          );

          // 5. Add a simple event listener to transaction for "abort" that rejects promise with transaction’s error.
          addASimpleEventListener(transaction, "abort", () =>
            reject(transaction.error)
          );
        });
      }
    );
  }

  /**
Asynchronously deletes all entries in this storage area.

This is done by actually deleting the underlying IndexedDB database. As such, it always can be used as a fail-safe to get a clean slate, as shown below.

The returned promise will fulfill with undefined on success.
   */
  clear(): Promise<void> {
    // 1. Let realm be the relevant Realm of this.
    const realm = globalThis;

    // 2. If this.[[DatabasePromise]] is not null, return the result of reacting to this.[[DatabasePromise]] with fulfillment and rejection handlers that both perform the following steps:
    if (DatabasePromise.get(this)) {
      return DatabasePromise.get(this)!.finally(() => {
        // 1. Set this.[[DatabasePromise]] to null.
        DatabasePromise.set(this, null);

        // 2. Return the result of deleting the database given this.[[DatabaseName]] and realm.
        return deletingTheDatabase(DatabaseName.get(this)!, realm);
      });
    }

    // 3. Otherwise, return the result of deleting the database given this.[[DatabaseName]] and realm.
    else {
      return deletingTheDatabase(DatabaseName.get(this)!, realm);
    }
  }

  keys() {}
  values() {}
  entries() {}
  [Symbol.asyncIterator](): AsyncIterableIterator<[K, V]> {}

  get backingStore(): KVStorageAreaBackingStore<N> {
    this.#BackingStoreObject ??= Object.freeze({
      database: this.#DatabaseName,
      store: "store",
      version: 1,
    });
    return this.#BackingStoreObject;
  }
}
