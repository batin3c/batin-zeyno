"use client";

import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

export function PhotoLightbox({
  urls,
  index,
  onClose,
}: {
  urls: string[];
  index: number | null;
  onClose: () => void;
}) {
  const open = index !== null && index >= 0;
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={open ? index : 0}
      slides={urls.map((src) => ({ src }))}
      plugins={[Zoom]}
      controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
      zoom={{
        maxZoomPixelRatio: 4,
        zoomInMultiplier: 2,
        doubleTapDelay: 200,
        doubleClickDelay: 200,
        pinchZoomDistanceFactor: 120,
      }}
      animation={{ fade: 220, swipe: 300 }}
      carousel={{ finite: false, padding: 0 }}
      styles={{
        container: { background: "rgba(31, 26, 20, 0.95)" },
      }}
    />
  );
}
