import { describe, it, expect, afterAll } from "vitest";
import { importReceivables, getQueue } from "@/lib/repo";
import { createDispute, resolveDispute, createCollectionEvent } from "@/lib/collections";
import { prisma } from "@/lib/prisma";
import {
  MAPPING,
  daysFromNowISO,
  createTestOrg,
  cleanupOrgs,
} from "@/test-utils/integration-utils";

const orgIds: string[] = [];

afterAll(async () => {
  await cleanupOrgs(orgIds);
});

describe("queue, disputes, tenant isolation (TODO-051)", () => {
  it("builds the queue with prioritization and removes disputed-only balances", async () => {
    const org = await createTestOrg("queue-spec");
    orgIds.push(org.id);

    const rows = [
      {
        customer: "Overdue Hero",
        invoiceNumber: "Q-1",
        invoiceDate: daysFromNowISO(-90),
        dueDate: daysFromNowISO(-45),
        amount: "8000",
        outstanding: "",
        email: "",
        phone: "",
      },
      {
        customer: "Fresh Co",
        invoiceNumber: "Q-2",
        invoiceDate: daysFromNowISO(-5),
        dueDate: daysFromNowISO(-1),
        amount: "2000",
        outstanding: "",
        email: "",
        phone: "",
      },
      {
        customer: "DisputeCo",
        invoiceNumber: "Q-3",
        invoiceDate: daysFromNowISO(-30),
        dueDate: daysFromNowISO(-5),
        amount: "4000",
        outstanding: "",
        email: "",
        phone: "",
      },
    ];
    await importReceivables(org.id, rows, MAPPING);

    const disputeCo = await prisma.customer.findFirst({
      where: { organizationId: org.id, name: "DisputeCo" },
      include: { invoices: true },
    });
    await createDispute(org.id, null, {
      invoiceId: disputeCo!.invoices[0].id,
      reason: "Quantity mismatch on delivery",
      category: "quantity",
    });

    const queue = await getQueue(org.id);
    const names = queue.map((q) => q.customer);
    expect(names).toContain("Overdue Hero");
    expect(names).toContain("Fresh Co");
    expect(names).not.toContain("DisputeCo"); // excluded while disputed

    const hero = queue.find((q) => q.customer === "Overdue Hero");
    const fresh = queue.find((q) => q.customer === "Fresh Co");
    expect(hero!.priority).toBe("high");
    expect(hero!.daysOverdue).toBeGreaterThan(fresh!.daysOverdue);

    // Resolving the dispute brings DisputeCo back into the queue.
    const dispute = await prisma.dispute.findFirst({ where: { invoiceId: disputeCo!.invoices[0].id } });
    await resolveDispute(org.id, null, dispute!.id, { status: "resolved" });

    const queue2 = await getQueue(org.id);
    const names2 = queue2.map((q) => q.customer);
    expect(names2).toContain("DisputeCo");
  });

  it("scopes all data to the requesting organization and blocks cross-organization reads", async () => {
    const orgA = await createTestOrg("tenant-a");
    const orgB = await createTestOrg("tenant-b");
    orgIds.push(orgA.id, orgB.id);

    const rowsA = [
      {
        customer: "Tenant A Customer",
        invoiceNumber: "T-A-1",
        invoiceDate: daysFromNowISO(-30),
        dueDate: daysFromNowISO(-3),
        amount: "1500",
        outstanding: "",
        email: "",
        phone: "",
      },
    ];
    const rowsB = [
      {
        customer: "Tenant B Customer",
        invoiceNumber: "T-B-1",
        invoiceDate: daysFromNowISO(-30),
        dueDate: daysFromNowISO(-3),
        amount: "900",
        outstanding: "",
        email: "",
        phone: "",
      },
    ];
    await importReceivables(orgA.id, rowsA, MAPPING);
    await importReceivables(orgB.id, rowsB, MAPPING);

    // Each org only sees its own queue.
    const queueA = await getQueue(orgA.id);
    const queueB = await getQueue(orgB.id);
    expect(queueA.map((q) => q.customer)).toEqual(["Tenant A Customer"]);
    expect(queueB.map((q) => q.customer)).toEqual(["Tenant B Customer"]);
    expect(queueA.map((q) => q.amount)).toEqual([1500]);
    expect(queueB.map((q) => q.amount)).toEqual([900]);

    // Idempotency keys are per-organization and scoped.
    const keyA = "tenant/key-A";
    const keyB = "tenant/key-B";
    await prisma.idempotencyKey.create({
      data: { organizationId: orgA.id, key: keyA, action: "test" },
    });
    await prisma.idempotencyKey.create({
      data: { organizationId: orgB.id, key: keyB, action: "test" },
    });
    expect(
      await prisma.idempotencyKey.count({
        where: { organizationId: orgA.id, key: { in: [keyA, keyB] } },
      })
    ).toBe(1);

    // Deleting a user/customer in one org does not affect the other.
    await prisma.customer.deleteMany({ where: { organizationId: orgA.id } });
    expect(await prisma.customer.count({ where: { organizationId: orgA.id } })).toBe(0);
    expect(await prisma.customer.count({ where: { organizationId: orgB.id } })).toBe(1);
  });

  it("writes tenant-scoped collection events", async () => {
    const org = await createTestOrg("events-spec");
    orgIds.push(org.id);

    await importReceivables(
      org.id,
      [
        {
          customer: "EventCo",
          invoiceNumber: "E-1",
          invoiceDate: daysFromNowISO(-30),
          dueDate: daysFromNowISO(-2),
          amount: "1200",
          outstanding: "",
          email: "",
          phone: "",
        },
      ],
      MAPPING
    );

    const customer = await prisma.customer.findFirst({ where: { organizationId: org.id } });
    await createCollectionEvent(org.id, null, {
      customerId: customer!.id,
      type: "CALL",
      description: "Left voicemail about overdue payment",
      metadata: { outcome: "no_answer" },
    });

    const events = await prisma.collectionEvent.findMany({ where: { organizationId: org.id } });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("CALL");
    expect(events[0].metadata).toMatchObject({ outcome: "no_answer" });
  });
});