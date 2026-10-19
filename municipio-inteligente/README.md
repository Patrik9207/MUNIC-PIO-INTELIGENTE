# Município Inteligente — aplicação

Aplicação acadêmica para análise preliminar de demonstrativos contábeis e fiscais municipais. Os valores são informados manualmente pelo usuário; o sistema não recebe, anexa nem lê PDFs.

## Requisitos

- Node.js 22.12 ou superior.
- npm.

## Executar

Na pasta `municipio-inteligente/`:

```bash
npm install
npm run dev
```

## Validar

```bash
npm test
npm run lint
npm run build
npm run preview
```

Os testes automatizados cobrem interpretação de números brasileiros, divisões por zero, indicadores principais e cruzamentos.

## Funcionalidades

- Entrada manual dos valores para cada um dos oito tipos de demonstrativo.
- Cálculo de indicadores, gráficos, verificações entre demonstrativos e diagnóstico por regras com base nos valores informados.
- Orientações na interface para consultar os demonstrativos oficiais e conferir os valores digitados.
- Relatório PDF com dados, fórmulas, limitações e orientações.
- Conjunto de demonstração dos oito documentos; todos os dados são fictícios.

## Limitações e segurança

O diagnóstico atual usa regras determinísticas. Não há integração com IA generativa, autenticação ou banco de dados. O sistema não permite upload, anexação ou leitura de PDFs. O usuário deve consultar os demonstrativos oficiais por conta própria e digitar os valores nos campos correspondentes. Campos ausentes não são estimados. Não se declara conformidade legal sem contexto suficiente.

Os dados são usados no navegador durante a sessão e não são enviados a um servidor. O relatório PDF exportado é uma ferramenta de apoio gerencial e não substitui a análise do profissional responsável nem procedimentos formais de controle.

## Publicação

O projeto usa Vite, React e TypeScript e pode ser conectado ao Lovable como um projeto Vite padrão, selecionando a pasta `municipio-inteligente/` como raiz. Confira o runtime e os comandos disponíveis na plataforma antes da publicação. Para build estática, o comando é `npm run build` e a pasta de saída é `dist/`.
