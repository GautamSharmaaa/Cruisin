// Governed by .rules v1.0
import type { Request, Response } from "express";
import { LogisticsJobService } from "../services/logistics/logistics-job.service.js";
import { LogisticsNotificationService } from "../services/logistics/logistics-notification.service.js";
import { LogisticsQuoteService } from "../services/logistics/logistics-quote.service.js";
import { LogisticsService } from "../services/logistics/logistics.service.js";
import type { PackageMeasurement } from "../types/logistics.types.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const LogisticsController = {
  quote: asyncHandler(
    async (
      req: Request<
        Record<string, string>,
        unknown,
        { deliveryPostcode: string; paymentMode: "prepaid" | "cod"; expectedCartVersion?: number }
      >,
      res: Response,
    ): Promise<void> => {
      const quote = await LogisticsQuoteService.create(
        req.user?.userId ?? "",
        req.body,
      );
      res.status(201).json(new ApiResponse(quote, "Delivery options loaded"));
    },
  ),
  tracking: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tracking = await LogisticsService.trackingForOrder(
      String(req.params.id ?? ""),
      req.user?.userId ?? "",
    );
    res.json(new ApiResponse(tracking, "Shipment tracking loaded"));
  }),
  list: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as {
      page: number;
      limit: number;
      orderId?: string;
      status?: string;
      search?: string;
      type?: string;
    };
    res.json(
      new ApiResponse(await LogisticsService.list(query), "Shipments loaded"),
    );
  }),
  ndr: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      type?: string;
    };
    res.json(
      new ApiResponse(
        await LogisticsService.list({ ...query, status: "ndr" }),
        "NDR shipments loaded",
      ),
    );
  }),
  rto: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      type?: string;
    };
    res.json(
      new ApiResponse(
        await LogisticsService.list({ ...query, status: "rto" }),
        "RTO shipments loaded",
      ),
    );
  }),
  byId: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(
      new ApiResponse(
        await LogisticsService.byId(String(req.params.shipmentId ?? "")),
        "Shipment loaded",
      ),
    );
  }),
  kpis: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(
      new ApiResponse(await LogisticsService.kpis(typeof req.query.startDate === "string" ? req.query.startDate : undefined), "Logistics KPIs loaded"),
    );
  }),
  syncHealth: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await LogisticsService.syncHealth(), "Shiprocket sync health loaded"));
  }),
  analytics: asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      res.json(
        new ApiResponse(
          await LogisticsService.analytics(Number(req.query.days ?? 30)),
          "Logistics analytics loaded",
        ),
      );
    },
  ),
  jobs: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as {
      page: number;
      limit: number;
      status?: string;
    };
    res.json(
      new ApiResponse(
        await LogisticsJobService.list(query),
        "Logistics jobs loaded",
      ),
    );
  }),
  notifications: asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const query = req.query as unknown as {
        page: number;
        limit: number;
        status?: string;
      };
      res.json(
        new ApiResponse(
          await LogisticsNotificationService.list(query),
          "Logistics notification events loaded",
        ),
      );
    },
  ),
  createOrder: asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      res.json(
        new ApiResponse(
          await LogisticsService.createProviderOrderForOrder(
            String(req.params.orderId ?? ""),
            req.user?.userId,
          ),
          "Provider order created",
        ),
      );
    },
  ),
  compareCouriers: asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      res.json(
        new ApiResponse(
          await LogisticsService.compareCouriers(
            String(req.params.shipmentId ?? ""),
          ),
          "Couriers compared",
        ),
      );
    },
  ),
  confirmPackage: asyncHandler(
    async (
      req: Request<Record<string, string>, unknown, PackageMeasurement>,
      res: Response,
    ): Promise<void> => {
      res.json(
        new ApiResponse(
          await LogisticsService.confirmPackage(
            String(req.params.shipmentId ?? ""),
            req.body,
            req.user?.userId ?? "",
          ),
          "Package confirmed",
        ),
      );
    },
  ),
  assignAwb: asyncHandler(
    async (
      req: Request<Record<string, string>, unknown, { courierId?: number }>,
      res: Response,
    ): Promise<void> => {
      res.json(
        new ApiResponse(
          await LogisticsService.assignAwb(
            String(req.params.shipmentId ?? ""),
            req.body.courierId,
            req.user?.userId,
          ),
          "AWB assigned",
        ),
      );
    },
  ),
  schedulePickup: asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      res.json(
        new ApiResponse(
          await LogisticsService.schedulePickup(
            String(req.params.shipmentId ?? ""),
            req.user?.userId,
          ),
          "Pickup scheduled",
        ),
      );
    },
  ),
  document: (kind: "label" | "invoice" | "manifest") =>
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      res.json(
        new ApiResponse(
          await LogisticsService.generateDocument(
            String(req.params.shipmentId ?? ""),
            kind,
            req.user?.userId,
          ),
          `${kind} generated`,
        ),
      );
    }),
  documentAccess: asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      res.json(
        new ApiResponse(
          await LogisticsService.documentAccess(
            String(req.params.shipmentId ?? ""),
            String(req.params.kind ?? "") as "label" | "invoice" | "manifest",
          ),
          "Document access loaded",
        ),
      );
    },
  ),
  track: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(
      new ApiResponse(
        await LogisticsService.refreshTracking(
          String(req.params.shipmentId ?? ""),
          "admin",
          req.user?.userId,
        ),
        "Tracking refreshed",
      ),
    );
  }),
  sync: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(
      new ApiResponse(
        await LogisticsService.reconcileShiprocketShipment(
          String(req.params.shipmentId ?? ""),
          "manual_sync",
          req.user?.userId,
        ),
        "Shiprocket shipment synchronized",
      ),
    );
  }),
  bulkSync: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(
      new ApiResponse(
        await LogisticsService.reconcileActiveShiprocketShipments({
          source: "manual_sync",
          adminId: req.user?.userId,
        }),
        "Active Shiprocket shipments synchronized",
      ),
    );
  }),
  cancel: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(
      new ApiResponse(
        await LogisticsService.cancel(
          String(req.params.shipmentId ?? ""),
          req.user?.userId ?? "",
        ),
        "Shipment cancelled",
      ),
    );
  }),
  ndrAction: asyncHandler(
    async (
      req: Request<
        Record<string, string>,
        unknown,
        { action: string; note?: string }
      >,
      res: Response,
    ): Promise<void> => {
      res.json(
        new ApiResponse(
          await LogisticsService.recordNdrAction(
            String(req.params.shipmentId ?? ""),
            req.body,
            req.user?.userId ?? "",
          ),
          "NDR action recorded",
        ),
      );
    },
  ),
  rtoWarehouse: asyncHandler(
    async (
      req: Request<
        Record<string, string>,
        unknown,
        { action: "received" | "inspection_passed" | "inspection_failed" }
      >,
      res: Response,
    ): Promise<void> => {
      res.json(
        new ApiResponse(
          await LogisticsService.markRtoWarehouse(
            String(req.params.shipmentId ?? ""),
            req.body,
            req.user?.userId ?? "",
          ),
          "RTO warehouse state updated",
        ),
      );
    },
  ),
};
