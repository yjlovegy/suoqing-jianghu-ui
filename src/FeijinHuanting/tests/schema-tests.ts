import * as lodash from 'lodash';
import { z } from 'zod';

(globalThis as any)._ = lodash;
(globalThis as any).z = z;

async function main(): Promise<void> {
  const schemaPath = '../schema.ts';
  const { Schema } = await import(schemaPath) as typeof import('../schema');
  const shortMillion = Schema.parse({ 资产: { 筹码预设: '100万美元' } });
  const shortThreeMillion = Schema.parse({ 资产: { 筹码预设: '300万美元' } });
  const canonical = Schema.parse({ 资产: { 筹码预设: '豪客300万美元', 玩家筹码: { 大筹码: 30, 小筹码: 0 } } });

  if (shortMillion.资产.筹码预设 !== '稳健100万美元') throw new Error('100万美元口语值未规范化');
  if (shortThreeMillion.资产.筹码预设 !== '豪客300万美元') throw new Error('300万美元口语值未规范化');
  if (canonical.资产.筹码预设 !== '豪客300万美元' || canonical.资产.玩家筹码.大筹码 !== 30) throw new Error('规范状态未被保留');

  console.info('FeijinHuanting schema tests: PASS');
}

void main();
