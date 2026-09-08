"use client";

import { useLayoutEffect } from "react";

declare global {
  interface Window {
    Cesium?: any;
    __AKARFINDER_CESIUM_TARGET_LENS__?: boolean;
  }
}

function setShellAttribute(name: string, value: string) {
  document.querySelector<HTMLElement>("[data-cesium-spike]")?.setAttribute(name, value);
}

function applyDaylightGrade(Cesium: any, scene: any) {
  if (!scene?.imageryLayers) return;

  for (let index = 0; index < scene.imageryLayers.length; index += 1) {
    const layer = scene.imageryLayers.get(index);
    if (!layer) continue;
    layer.brightness = 1.38;
    layer.contrast = 0.8;
    layer.saturation = 1.02;
    layer.gamma = 1.2;
    layer.hue = Cesium.Math.toRadians(-1.5);
  }

  scene.backgroundColor = Cesium.Color.fromCssColorString("#bfe4f2");
  setShellAttribute("data-cesium-day-mode", "true");
}

function ensureOsmBuildings(Cesium: any, scene: any) {
  if (!scene || window.innerWidth < 1024) {
    setShellAttribute("data-cesium-buildings-state", "skipped");
    return;
  }

  if ((scene as any).__AKARFINDER_OSM_BUILDINGS_REQUESTED__) return;
  (scene as any).__AKARFINDER_OSM_BUILDINGS_REQUESTED__ = true;
  setShellAttribute("data-cesium-buildings-state", "loading");

  if (typeof Cesium.createOsmBuildingsAsync !== "function") {
    setShellAttribute("data-cesium-buildings-state", "unavailable");
    return;
  }

  void Cesium.createOsmBuildingsAsync({
    enableShowOutline: false,
    showOutline: false,
    style: new Cesium.Cesium3DTileStyle({
      color: "color('#eee7dc', 0.92)",
    }),
  })
    .then((tileset: any) => {
      if (scene.isDestroyed?.()) return;
      tileset.maximumScreenSpaceError = 4;
      tileset.dynamicScreenSpaceError = true;
      scene.primitives.add(tileset);
      scene.requestRender?.();
      setShellAttribute("data-cesium-buildings-state", "available");
    })
    .catch((error: unknown) => {
      console.warn("[vivre-ici-cesium-spike] OSM buildings unavailable", error);
      setShellAttribute("data-cesium-buildings-state", "unavailable");
    });
}

function installTargetLens(Cesium: any) {
  if (!Cesium?.Camera?.prototype?.lookAt || window.__AKARFINDER_CESIUM_TARGET_LENS__) return;

  const cameraPrototype = Cesium.Camera.prototype;
  const originalLookAt = cameraPrototype.lookAt;

  cameraPrototype.lookAt = function targetLockedLookAt(this: any, target: any, offset: any) {
    try {
      if (window.innerWidth >= 1024 && offset && typeof offset.range === "number") {
        const cartographic = Cesium.Cartographic.fromCartesian(target);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        const isCasablancaTarget = longitude > -7.8 && longitude < -7.4 && latitude > 33.4 && latitude < 33.8;

        if (isCasablancaTarget) {
          const scene = this?._scene;
          applyDaylightGrade(Cesium, scene);
          ensureOsmBuildings(Cesium, scene);

          const tunedTarget = Cesium.Cartesian3.fromDegrees(
            longitude + 0.0035,
            latitude + 0.0100,
            0,
          );

          if (this.frustum && "fov" in this.frustum) {
            this.frustum.fov = Cesium.Math.toRadians(40);
          }

          const tunedOffset = new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(346),
            Cesium.Math.toRadians(-40),
            8500,
          );

          return originalLookAt.call(this, tunedTarget, tunedOffset);
        }
      }
    } catch {
      // Fail closed to the existing camera if Cesium internals differ.
    }

    return originalLookAt.call(this, target, offset);
  };

  window.__AKARFINDER_CESIUM_TARGET_LENS__ = true;
}

export function CesiumTargetLens() {
  useLayoutEffect(() => {
    if (window.Cesium) {
      installTargetLens(window.Cesium);
      return;
    }

    const attach = (script: HTMLScriptElement) => {
      if (!/\/cesium@[^/]+\/Build\/Cesium\/Cesium\.js/i.test(script.src)) return;
      script.addEventListener(
        "load",
        () => {
          if (window.Cesium) installTargetLens(window.Cesium);
        },
        { once: true },
      );
    };

    document.querySelectorAll<HTMLScriptElement>("script[src]").forEach(attach);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLScriptElement) attach(node);
        });
      }
    });

    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, []);

  return (
    <style jsx global>{`
      @media (min-width: 1024px) {
        .cesium-spike-map-atmosphere {
          height: 36% !important;
          background: linear-gradient(
            180deg,
            rgba(118, 203, 239, 0.42),
            rgba(151, 215, 240, 0.24) 46%,
            rgba(190, 226, 239, 0.08) 72%,
            rgba(190, 226, 239, 0)
          ) !important;
          mix-blend-mode: screen !important;
        }
      }
    `}</style>
  );
}
