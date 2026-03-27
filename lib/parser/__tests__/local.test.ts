import { parseTasksLocally } from "../local";
import type { LlmParseContext } from "../types";

const mockContext: LlmParseContext = {
  nowIso: "2026-03-27T10:00:00.000Z",
  timezone: "Asia/Shanghai",
  assignees: [
    { id: "1", name: "爸爸", nameEn: "Dad" },
    { id: "2", name: "妈妈", nameEn: "Mom" }
  ]
};

describe("parseTasksLocally", () => {
  test("解析单个任务 - 中文", async () => {
    const result = await parseTasksLocally("明天8点学习", mockContext);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("学习");
    expect(result[0].datetime).toContain("2026-03-28T08:00");
  });

  test("解析单个任务 - 英文", async () => {
    const result = await parseTasksLocally("tomorrow 9am study", mockContext);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("学习");
  });

  test("解析批量任务 - 逗号分隔", async () => {
    const result = await parseTasksLocally("明天8点学习，下午3点购物", mockContext);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("学习");
    expect(result[1].type).toBe("购物");
  });

  test("解析批量任务 - 换行分隔", async () => {
    const result = await parseTasksLocally("明天学习\n后天购物", mockContext);
    expect(result).toHaveLength(2);
  });

  test("识别负责人 - 中文", async () => {
    const result = await parseTasksLocally("明天爸爸学习", mockContext);
    expect(result[0].assignee).toBe("1");
  });

  test("识别负责人 - 英文", async () => {
    const result = await parseTasksLocally("tomorrow Dad study", mockContext);
    expect(result[0].assignee).toBe("1");
  });
});
