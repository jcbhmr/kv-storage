/**
 * @see https://web.archive.org/web/20220421125520/https://wicg.github.io/kv-storage/#performing-a-database-operation
 */
export default function performADatabaseOperation<T>(
  area: KVStorageArea,
  mode: string,
  steps: (transaction: IDBTransaction, store: IDBObjectStore) => T
): Promise<T> {
  // To perform a database operation given a KVStorageArea area, a mode string mode, and a set of steps steps that operate on an IDBTransaction transaction and an IDBObjectStore store:

  // 1. Assert: area.[[DatabaseName]] is a string (and in particular is not null).
  console.assert(
    typeof DatabaseName.get(area)! === "string" &&
      DatabaseName.get(area)! != null
  );

  // 2. If area.[[DatabasePromise]] is null, initialize the database promise for area.
  if (DatabasePromise.get(area) == null) {
    initializeTheDatabasePromise(area);
  }

  // 3. Return the result of reacting to area.[[DatabasePromise]] with a fulfillment handler that performs the following steps, given database:
  return DatabasePromise.get(area)!.then((database) => {
    // 1. Let transaction be the result of performing the steps listed in the description of IDBDatabase's transaction() method on database, given the arguments "store" and mode.
    const transaction = database.transaction("store", mode);

    // 2. Let store be the result of performing the steps listed in the description of IDBTransaction's objectStore() method on transaction, given the argument "store".
    const store = transaction.objectStore("store");

    // 3. Return the result of performing steps, passing along transaction and store.
    return steps(transaction, store);
  });
}
