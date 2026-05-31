import { NextResponse } from "next/server";
import type { CarProfile, LatLng, OptimizeRequest, PriceZone } from "@/lib/domain/types";
import { kr } from "@/lib/domain/money";
import { getExternalClients } from "@/lib/external/factory";
import { optimize } from "@/lib/optimizer/optimizer";
import { SEED_OFFERS } from "@/seed/offers";
import { SEED_STORES } from "@/seed/stores";

const deps = getExternalClients();

interface RequestBody {
  origin: LatLng;
  originZone: PriceZone;
  basket: { productId: string; qty: number }[];
  car: CarProfile;
  maxStores?: number;
  timeValueKrPerHour?: number;
}

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;

  const req: OptimizeRequest = {
    origin: body.origin,
    originZone: body.originZone,
    basket: body.basket.filter((l) => l.qty > 0),
    car: body.car,
    maxRadiusMeters: 60_000,
    maxStores: body.maxStores ?? 3,
    timeValueOrePerHour: kr(body.timeValueKrPerHour ?? 0),
  };

  if (req.basket.length === 0) {
    return NextResponse.json({ plans: [], unfulfillable: [], bestSingleStore: null });
  }

  const result = await optimize(req, SEED_STORES, SEED_OFFERS, deps);
  return NextResponse.json(result);
}
