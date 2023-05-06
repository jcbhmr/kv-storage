const defaultKVStorageArea = new KVStorageArea("default");

function get_kvStorage(): KVStorageArea {
  return defaultKVStorageArea;
}

export default { get: get_kvStorage, enumerable: true, configurable: true };
