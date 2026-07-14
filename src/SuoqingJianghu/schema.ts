export const Schema = z.object({
  世界: z.object({
    日期: z.string().prefault('承熙十二年八月十五'),
    时辰: z.string().prefault('戌时'),
    当前地点: z.string().prefault('京畿·长亭破庙'),
  }).prefault({}),
  锁情册: z.object({
    签契者: z.record(
      z.string().describe('首次写下愿望者的姓名'),
      z.object({
        档案来源: z.enum(['核心档案', '动态档案']).prefault('动态档案'),
        档案覆盖: z.object({
          姓名: z.string().prefault('未知'),
          性别: z.string().prefault('未知'),
          年龄: z.coerce.number().prefault(18),
          身高: z.string().prefault('未知'),
          胸部大小: z.string().prefault('不适用'),
          宗门: z.string().prefault('无'),
          武学: z.string().prefault('未知'),
          详细人物小传: z.string().prefault('暂无档案'),
        }).prefault({}).transform(data => {
          const 是女性 = data.性别 === '女';
          const 年龄 = 是女性 ? _.clamp(data.年龄, 18, 35) : Math.max(data.年龄, 18);
          const 胸部大小 = 是女性 && ['C杯', 'D杯', 'E杯'].includes(data.胸部大小)
            ? data.胸部大小
            : 是女性 ? 'C杯' : '不适用';
          return { ...data, 年龄, 胸部大小 };
        }),
        当前契约: z.object({
          愿望: z.string().prefault('未填写'),
          代价: z.string().prefault('待<user>填写'),
          履约进度: z.enum([
            '无当前契约',
            '待填写代价',
            '待许愿者确认',
            '愿望实现中',
            '待履行代价',
            '履约中',
            '长期履约中',
            '已完成',
            '已作废',
          ]).prefault('待填写代价'),
        }).prefault({}),
        历史契约: z.record(
          z.string().describe('契约编号'),
          z.object({
            愿望: z.string().prefault('未记录'),
            代价: z.string().prefault('未记录'),
            结果: z.string().prefault('未记录'),
            结契时间: z.string().prefault('未知'),
          }).prefault({}),
        ).prefault({}),
      }).prefault({}),
    ).prefault({}),
  }).prefault({}),
});

export type Schema = z.output<typeof Schema>;