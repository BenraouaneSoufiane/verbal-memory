import { NextRequest, NextResponse } from "next/server";
import { getGameSession } from "@/lib/session-store";
import {
  PATTERN_MEMORY_GAME_TYPE,
  type PatternMemoryIconId,
  type PatternMemorySessionData,
} from "@/lib/tests/pattern-memory";
import { __iconNode as bellIconNode } from "lucide-react/dist/esm/icons/bell.js";
import { __iconNode as cameraIconNode } from "lucide-react/dist/esm/icons/camera.js";
import { __iconNode as cloudIconNode } from "lucide-react/dist/esm/icons/cloud.js";
import { __iconNode as flameIconNode } from "lucide-react/dist/esm/icons/flame.js";
import { __iconNode as giftIconNode } from "lucide-react/dist/esm/icons/gift.js";
import { __iconNode as heartIconNode } from "lucide-react/dist/esm/icons/heart.js";
import { __iconNode as leafIconNode } from "lucide-react/dist/esm/icons/leaf.js";
import { __iconNode as moonIconNode } from "lucide-react/dist/esm/icons/moon.js";
import { __iconNode as musicIconNode } from "lucide-react/dist/esm/icons/music-4.js";
import { __iconNode as snowflakeIconNode } from "lucide-react/dist/esm/icons/snowflake.js";
import { __iconNode as starIconNode } from "lucide-react/dist/esm/icons/star.js";
import { __iconNode as sunIconNode } from "lucide-react/dist/esm/icons/sun.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type IconNode = Array<[string, Record<string, string>]>;

const ICON_NODES: Record<PatternMemoryIconId, IconNode> = {
  sun: sunIconNode,
  moon: moonIconNode,
  cloud: cloudIconNode,
  star: starIconNode,
  heart: heartIconNode,
  bell: bellIconNode,
  leaf: leafIconNode,
  flame: flameIconNode,
  snowflake: snowflakeIconNode,
  music: musicIconNode,
  camera: cameraIconNode,
  gift: giftIconNode,
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderNode(node: [string, Record<string, string>]): string {
  const [tagName, attrs] = node;
  const attrString = Object.entries(attrs)
    .filter(([key]) => key !== "key")
    .map(([key, value]) => `${key}="${escapeXml(value)}"`)
    .join(" ");

  return `<${tagName} ${attrString} />`;
}

function renderIconSvg(iconId: PatternMemoryIconId): string {
  const iconMarkup = ICON_NODES[iconId].map(renderNode).join("");

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">',
    iconMarkup,
    "</svg>",
  ].join("");
}

export async function GET(
  _req: NextRequest,
  context: RouteContext<"/api/pattern-memory/assets/[sessionId]/[token]">
) {
  try {
    const { sessionId, token } = await context.params;

    const session = await getGameSession<PatternMemorySessionData>(
      PATTERN_MEMORY_GAME_TYPE,
      sessionId
    );

    if (!session) {
      return new NextResponse("Session not found.", { status: 404 });
    }

    const asset = session.currentAssets.find((entry) => entry.token === token);

    if (!asset) {
      return new NextResponse("Image not found.", { status: 404 });
    }

    return new NextResponse(renderIconSvg(asset.iconId), {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/pattern-memory/assets/[sessionId]/[token] failed:", error);

    return new NextResponse("Failed to render image.", { status: 500 });
  }
}
