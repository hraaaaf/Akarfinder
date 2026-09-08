"use client";

import { useLayoutEffect } from "react";

declare global {
  interface Window {
    Cesium?: any;
    __AKARFINDER_CESIUM_TARGET_LENS__?: boolean;
  }
}

function installTargetLens(Cesium: any) {
  if (!Cesium?.Camera?.prototype?.lookAt || window.__AKARFINDER_CESIUM_TARGET_LENS__) return;

  const cameraPrototype = Cesium.Camera.prototype;
  const originalLookAt = cameraPrototype.lookAt;

  cameraPrototype.lookAt = function targetLockedLookAt(target: any, offset: any) {
    try {
      if (window.innerWidth >= 1024 && offset && typeof offset.range === "number") {
        const cartographic = Cesium.Cartographic.fromCartesian(target);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        const isCasablancaTarget = longitude > -7.8 && longitude < -7.4 && latitude > 33.4 && latitude < 33.8;

        if (isCasablancaTarget) {
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

  return null;
}
