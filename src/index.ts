import kvStorageDescriptor from "./kvStorageDescriptor";

const kvStorage = (0, kvStorageDescriptor.get)();

export default kvStorage;
export { default as KVStorageArea } from "./KVStorageArea";
