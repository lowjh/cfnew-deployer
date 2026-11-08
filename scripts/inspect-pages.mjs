#!/usr/bin/env node
// 只读诊断：查 cfnewup-dic Pages 项目的构建设置与最近部署记录。
// 不做任何部署操作。凭据取自本仓库已有的 CLOUDFLARE_API_TOKEN secret。

const API = 'https://api.cloudflare.com/client/v4';
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !accountId) {
  console.error('缺少 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function get(path) {
  const res = await fetch(`${API}${path}`, { headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  if (!res.ok) {
    console.log(`\n[${res.status}] ${path}`);
    console.log(JSON.stringify(json.errors || json.raw));
    return null;
  }
  return json.result;
}

const project = await get(`/accounts/${accountId}/pages/projects/cfnewup-dic`);
if (project) {
  console.log('=== 项目构建设置 ===');
  console.log('name           :', project.name);
  console.log('subdomain      :', project.subdomain);
  console.log('production_branch:', project.production_branch);
  console.log('build_command  :', project.build_config?.build_command ?? '(无)');
  console.log('output_dir     :', project.build_config?.output_dir ?? '(无)');
  console.log('root_dir       :', project.source?.config?.root_dir ?? '(无)');
  console.log('source type    :', project.source?.type, project.source?.config?.owner, project.source?.config?.repo_name);
  console.log('deployment_configs:', JSON.stringify(project.deployment_configs ?? {}, null, 1).slice(0, 1200));
}

console.log('\n=== 最近部署 ===');
const deployments = await get(`/accounts/${accountId}/pages/projects/cfnewup-dic/deployments?per_page=8`);
if (deployments) {
  for (const d of deployments) {
    console.log(
      `${d.created_at} | ${d.latest_stage?.name ?? '-'} ${d.latest_stage?.status ?? '-'} | env=${d.env ?? '-'} | branch=${d.deployment_trigger?.metadata?.branch ?? '-'} | commit=${(d.deployment_trigger?.metadata?.commit_hash ?? '').slice(0, 8)}`
    );
  }
}

console.log('\n=== 线上产物指纹 ===');
for (const url of ['https://cfnewup-dic.pages.dev/', 'https://cf.louwh.bond/louwh']) {
  const res = await fetch(url);
  const body = await res.text();
  console.log(url, '->', res.status, 'len=', body.length);
}
