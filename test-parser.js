import { parseTasksLocally } from "./lib/parser/local";

const mockContext = {
  nowIso: "2026-03-27T10:00:00.000Z",
  timezone: "Asia/Shanghai",
  assignees: [
    { id: "1", name: "妈妈", nameEn: "Mom" },
    { id: "2", name: "外婆", nameEn: "Grandma" },
    { id: "3", name: "米歇尔", nameEn: "Michelle" }
  ]
};

const input = "明天下午参加海光会,周五妈妈和外婆接千千下课,每周三米歇尔送万万上体育课";

parseTasksLocally(input, mockContext).then(results => {
  console.log("解析结果：");
  results.forEach((result, index) => {
    console.log(`\n任务 ${index + 1}:`);
    console.log(`  标题: ${result.title_zh}`);
    console.log(`  时间: ${result.datetime}`);
    console.log(`  类型: ${result.type}`);
    console.log(`  负责人: ${result.assignee}`);
    console.log(`  重复: ${result.repeat_cycle}`);
  });
}).catch(err => {
  console.error("解析失败:", err);
});
