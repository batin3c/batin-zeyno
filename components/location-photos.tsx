"use client";

import { useMemo, useTransition } from "react";
import {
  addLocationPhoto,
  removeLocationPhoto,
  removeLocationPhotosBulk,
} from "@/app/actions/locations";
import { PhotoGallery, type GalleryItem } from "./photo-gallery";

export function LocationPhotos({
  locationId,
  tripId,
  urls,
  googleUrls = [],
}: {
  locationId: string;
  tripId: string;
  urls: string[];
  googleUrls?: string[];
}) {
  const [, startTransition] = useTransition();

  const items: GalleryItem[] = useMemo(
    () => [
      ...googleUrls.map((u) => ({ url: u, isExternal: true })),
      ...urls.map((u) => ({ id: u, url: u })),
    ],
    [googleUrls, urls]
  );

  const onUpload = async (file: File) => {
    const fd = new FormData();
    fd.set("location_id", locationId);
    fd.set("trip_id", tripId);
    fd.set("file", file);
    const r = await addLocationPhoto(fd);
    return r;
  };

  const onRemove = async (url: string) => {
    return new Promise<{ ok: boolean }>((resolve) => {
      startTransition(async () => {
        await removeLocationPhoto(locationId, tripId, url);
        resolve({ ok: true });
      });
    });
  };

  const onRemoveBulk = async (urls: string[]) => {
    return removeLocationPhotosBulk(locationId, tripId, urls);
  };

  return (
    <PhotoGallery
      items={items}
      onUpload={onUpload}
      onRemove={onRemove}
      onRemoveBulk={onRemoveBulk}
      variant="list"
      emptyHint=""
    />
  );
}
