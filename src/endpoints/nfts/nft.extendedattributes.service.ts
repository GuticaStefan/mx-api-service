import { MatchUtils } from "@multiversx/sdk-nestjs-common";
import { Injectable } from "@nestjs/common";

@Injectable()
export class NftExtendedAttributesService {
  getTags(attributes: string): string[] {
    const match = MatchUtils.getTagsFromBase64Attributes(attributes);
    if (!match || !match.groups) {
      return [];
    }

    return match.groups['tags'].split(',');
  }
}
