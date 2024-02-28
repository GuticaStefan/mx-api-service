import { CollectionTrait } from "src/endpoints/collections/entities/collection.trait";

export interface PersistenceInterface {
  getCollectionTraits(collection: string): Promise<CollectionTrait[] | null>

  getKeybaseConfirmationForIdentity(identity: string): Promise<string[] | undefined>

  setKeybaseConfirmationForIdentity(identity: string, keys: string[]): Promise<void>

  getSetting<T>(name: string): Promise<T | undefined>

  setSetting<T>(name: string, value: T): Promise<void>

  getAllSettings(): Promise<{ name: string, value: any }[]>
}
