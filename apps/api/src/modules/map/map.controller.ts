import { Controller, Get, Query } from '@nestjs/common';
import type { MapLayers } from '@dari/contracts';
import { z } from 'zod';
import { Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { MapService } from './map.service';

const layersQuery = z.object({ city: z.string().trim().min(2).max(60) });

@Public()
@Controller({ path: 'map', version: '1' })
export class MapController {
  constructor(private readonly map: MapService) {}

  /** Everything positioned in the city (businesses, events, listings, news) for the live map. */
  @Get('layers')
  layers(@Query(zod(layersQuery)) q: z.infer<typeof layersQuery>): Promise<MapLayers> {
    return this.map.layers(q.city);
  }
}
