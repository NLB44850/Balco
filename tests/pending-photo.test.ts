import { describe, expect, it } from "vitest";

import { onPendingPhoto, photoPreviewUri, setPendingPhoto, setPendingPhotoFailed, takePendingPhoto } from "../lib/ai/pending-photo";

const photo = { uri: "file:///cache/photo.jpg", base64: "AAAA" };

describe("photo prise depuis Aujourd'hui", () => {
  it("attend Observer, une seule fois", () => {
    setPendingPhoto(photo);
    expect(takePendingPhoto()).toEqual({ status: "ok", photo });
    expect(takePendingPhoto()).toBeNull();
  });

  it("arrive tout de suite dans Observer déjà ouvert", () => {
    const received: unknown[] = [];
    const stop = onPendingPhoto((pending) => received.push(pending));
    setPendingPhoto(photo);
    stop();
    expect(received).toEqual([{ status: "ok", photo }]);
    expect(takePendingPhoto()).toBeNull();
  });

  it("une photo illisible est signalée", () => {
    setPendingPhotoFailed();
    expect(takePendingPhoto()).toEqual({ status: "failed" });
  });

  it("l'aperçu montre les données de la photo", () => {
    expect(photoPreviewUri(photo)).toBe("data:image/jpeg;base64,AAAA");
    expect(photoPreviewUri({ uri: photo.uri, base64: "" })).toBe(photo.uri);
  });
});
