import {combineLatest, Observable, of} from "rxjs";
import {IFilterItem, MEDIA_FILTER_TYPE, TYPE_FILTER_ITEMS} from "./filter.component";
import {map} from "rxjs/internal/operators";
import {Clip, Dictionary, MediaType, Tag} from "@memebox/contracts";
import {sortClips} from "../../../../../projects/utils/src/lib/sort-clips";
import {switchMap} from "rxjs/operators";
import {lazyArray} from "../../../../../projects/utils/src/lib/lazyArray";

export function createCombinedFilterItems$ (
  clip$: Observable<Clip[]>,
  tagMap$: Observable<Dictionary<Tag>>,
  showOnlyAvailableTypes: boolean
): Observable<IFilterItem[]> {
  return combineLatest([
    clip$,
    tagMap$
  ]).pipe(
    map(([allMedia, tagDictionary]) => {
      const filterItems = [];

      // todo filter media types if not existing

      const allTags = new Set<string>();
      const allTypes = new Set<MediaType>();

      for (const clip of allMedia) {
        allTypes.add(clip.type);

        for (const tagId of (clip?.tags ?? [])) {
          allTags.add(tagId)
        }
      }

      if (showOnlyAvailableTypes) {
        filterItems.push(...TYPE_FILTER_ITEMS.filter(filterItem => allTypes.has(filterItem.value)));
      } else {
        filterItems.push(...TYPE_FILTER_ITEMS);
      }

      allTags.forEach(value => {
        const tag = tagDictionary[value];

        if (tag) {
          console.info({ value, tag, tagDictionary });

          filterItems.push({
            value,
            icon: 'tag',
            type: 'TAG',
            label: tagDictionary[value].name
          })
        }
      })


      return filterItems;
    })
  )
}


export function filterClips$(
  allClips$: Observable<Clip[]>,
  selectedFilters$: Observable<IFilterItem[]>
): Observable<Clip[]> {
  return combineLatest([
    allClips$,
    selectedFilters$
  ]).pipe(
    map(([allClips, filteredItems]) => {
      if (filteredItems.length === 0) {
        return allClips;
      }

      const listOfTypes: MediaType[] = filteredItems
        .filter(f => f.type === MEDIA_FILTER_TYPE)
        .map(f => f.value);

      const listOfTagIds: string[] = filteredItems
        .filter(f => f.type === 'TAG')
        .map(f => f.value);

      return allClips.filter(clip => {
        let allowedByType = true;
        let allowedByTag = true;

        if (listOfTypes.length !== 0) {
          allowedByType = listOfTypes.includes(clip.type);
        }


        if (listOfTagIds.length !== 0) {
          allowedByTag = listOfTagIds.every(filterTagId => clip.tags?.includes(filterTagId) );
        }


        return allowedByType && allowedByTag;
      })

    }),
    map(clipsToList => sortClips(clipsToList)),
    switchMap(clips => {
      console.info({clips});

      return clips.length === 0
          ? of([])
          : of(clips).pipe(
            // lazyArray cant work with zero items...
            lazyArray(10, 3) // todo refactor / rebuild this lazyArray pipe
          );
      }
    )
  );
}
