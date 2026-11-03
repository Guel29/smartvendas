import json
import os

with open('migrations/001_initial_schema.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

os.makedirs('src/data', exist_ok=True)

# Format as json string representation for safe embedding
json_sql = json.dumps(sql)

ts_content = f'''// SMART VENDAS - SCHEMA SQL OFICIAL MYSQL 8
// 13 Tabelas com chaves de unicidade, tipos monetários exatos DECIMAL(14,2) e dados iniciais
export const FULL_SCHEMA_SQL: string = {json_sql};

export function downloadSqlSchema() {{
  const blob = new Blob([FULL_SCHEMA_SQL], {{ type: 'application/sql;charset=utf-8' }});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '001_initial_schema.sql';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}}
'''

with open('src/data/schemaSql.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f"Generated src/data/schemaSql.ts successfully! Size: {len(ts_content)} bytes")
