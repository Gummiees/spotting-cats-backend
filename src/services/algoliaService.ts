import { Algoliasearch, algoliasearch } from 'algoliasearch';
import { Cat } from '@/models/cat';
import { CatService } from '@/services/catService';

export interface AlgoliaCatRecord extends Record<string, unknown> {
  objectID: string;
  name?: string;
  age?: number;
  breed?: string;
  isDomestic?: boolean;
  isMale?: boolean;
  isSterilized?: boolean;
  isFriendly?: boolean;
  isUserOwner: boolean;
  totalLikes: number;
  userId?: string;
  protectorId?: string;
  colonyId?: string;
  xCoordinate: number;
  yCoordinate: number;
  extraInfo?: string;
  createdAt: Date;
  updatedAt?: Date;
  confirmedOwnerAt?: Date;
  // Searchable text fields for better search experience
  _tags?: string[];
}

export class AlgoliaService {
  private client: Algoliasearch;
  private indexName: string;
  private catService: CatService;

  constructor() {
    // Initialize Algolia client with your credentials
    this.client = algoliasearch(
      process.env.ALGOLIA_APP_ID || '',
      process.env.ALGOLIA_API_KEY || ''
    );

    // Set the index name
    this.indexName = 'cats_index';
    this.catService = new CatService();
  }

  /**
   * Transform a Cat object to Algolia record format
   */
  private transformCatToAlgoliaRecord(cat: Cat): AlgoliaCatRecord {
    const tags: string[] = [];

    // Add tags for better search and filtering
    if (cat.isDomestic) tags.push('domestic');
    if (cat.isMale) tags.push('male');
    if (cat.isSterilized) tags.push('sterilized');
    if (cat.isFriendly) tags.push('friendly');
    if (cat.isUserOwner) tags.push('user-owner');
    if (cat.breed) tags.push(cat.breed.toLowerCase());
    if (cat.age) {
      if (cat.age < 1) tags.push('kitten');
      else if (cat.age < 3) tags.push('young');
      else if (cat.age < 7) tags.push('adult');
      else tags.push('senior');
    }

    return {
      objectID: cat.id!,
      name: cat.name,
      age: cat.age,
      breed: cat.breed,
      isDomestic: cat.isDomestic,
      isMale: cat.isMale,
      isSterilized: cat.isSterilized,
      isFriendly: cat.isFriendly,
      isUserOwner: cat.isUserOwner,
      totalLikes: cat.totalLikes,
      userId: cat.userId,
      protectorId: cat.protectorId,
      colonyId: cat.colonyId,
      xCoordinate: cat.xCoordinate,
      yCoordinate: cat.yCoordinate,
      extraInfo: cat.extraInfo,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      confirmedOwnerAt: cat.confirmedOwnerAt,
      _tags: tags,
    };
  }

  /**
   * Index all cats from the database to Algolia
   */
  async indexAllCats(): Promise<{
    success: boolean;
    indexedCount: number;
    error?: string;
  }> {
    try {
      console.log('Starting to index all cats to Algolia...');

      // Fetch all cats from the database
      const cats = await this.catService.getAll();

      if (cats.length === 0) {
        console.log('No cats found in database to index');
        return { success: true, indexedCount: 0 };
      }

      // Transform cats to Algolia format
      const algoliaRecords = cats.map((cat) =>
        this.transformCatToAlgoliaRecord(cat)
      );

      // Save objects to Algolia
      await this.client.saveObjects({
        indexName: this.indexName,
        objects: algoliaRecords,
      });

      console.log(
        `Successfully indexed ${algoliaRecords.length} cats to Algolia`
      );

      return {
        success: true,
        indexedCount: algoliaRecords.length,
      };
    } catch (error) {
      console.error('Error indexing cats to Algolia:', error);
      return {
        success: false,
        indexedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Index a single cat to Algolia
   */
  async indexCat(cat: Cat): Promise<{ success: boolean; error?: string }> {
    try {
      if (!cat.id) {
        throw new Error('Cat must have an ID to be indexed');
      }

      const algoliaRecord = this.transformCatToAlgoliaRecord(cat);
      await this.client.saveObjects({
        indexName: this.indexName,
        objects: [algoliaRecord],
      });

      console.log(`Successfully indexed cat ${cat.id} to Algolia`);
      return { success: true };
    } catch (error) {
      console.error('Error indexing cat to Algolia:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update a cat in Algolia index
   */
  async updateCat(cat: Cat): Promise<{ success: boolean; error?: string }> {
    return this.indexCat(cat); // Algolia's saveObject handles both create and update
  }

  /**
   * Delete a cat from Algolia index
   */
  async deleteCat(
    catId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.deleteObject({
        indexName: this.indexName,
        objectID: catId,
      });
      console.log(`Successfully deleted cat ${catId} from Algolia`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting cat from Algolia:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search cats in Algolia
   */
  async searchCats(
    query: string,
    filters?: string
  ): Promise<{ hits: AlgoliaCatRecord[]; nbHits: number }> {
    try {
      const searchParams: any = {
        query,
        hitsPerPage: 20,
      };

      if (filters) {
        searchParams.filters = filters;
      }

      const result = await this.client.search({
        indexName: this.indexName,
        query,
        ...searchParams,
      });

      // The result structure depends on the API version
      const searchResult = result as any;
      return {
        hits: searchResult.hits || searchResult.results?.[0]?.hits || [],
        nbHits: searchResult.nbHits || searchResult.results?.[0]?.nbHits || 0,
      };
    } catch (error) {
      console.error('Error searching cats in Algolia:', error);
      throw error;
    }
  }

  /**
   * Clear all records from the Algolia index
   */
  async clearIndex(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.clearObjects({
        indexName: this.indexName,
      });
      console.log('Successfully cleared Algolia index');
      return { success: true };
    } catch (error) {
      console.error('Error clearing Algolia index:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<{
    nbHits: number;
    nbPages: number;
    avgClickPosition: number;
  }> {
    try {
      const stats = await this.client.getSettings({
        indexName: this.indexName,
      });

      // The stats structure depends on the API version
      const statsResult = stats as any;
      return {
        nbHits: statsResult.nbHits || 0,
        nbPages: statsResult.nbPages || 0,
        avgClickPosition: statsResult.avgClickPosition || 0,
      };
    } catch (error) {
      console.error('Error getting index stats:', error);
      throw error;
    }
  }
}
