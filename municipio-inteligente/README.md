# Município Inteligente — aplicação

Aplicação acadêmica para análise preliminar de demonstrativos contábeis e fiscais municipais. Os PDFs são processados localmente no navegador; os valores extraídos podem ser conferidos e corrigidos antes dos cálculos.

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

- Carregamento de múltiplos PDFs e categorização manual ou automática.
- Extração local de texto, com edição manual dos campos reconhecidos.
- Indicadores patrimoniais, orçamentários, fiscais e de restos a pagar.
- Gráficos simples, verificações entre demonstrativos e diagnóstico por regras.
- Relatório PDF com dados, fórmulas, limitações e orientações.
- Conjunto de demonstração dos oito documentos; todos os dados são fictícios.

## Limitações e segurança

O diagnóstico atual usa regras determinísticas. Não há integração com IA generativa, autenticação, serviço externo, banco de dados ou OCR. PDFs digitalizados exigem entrada manual. A extração automática é heurística e precisa ser conferida com os documentos originais; campos ausentes não são estimados. Não se declara conformidade legal sem contexto suficiente.

Os arquivos são processados no navegador e não são enviados a um servidor. O relatório é uma ferramenta de apoio gerencial e não substitui a análise do profissional responsável nem procedimentos formais de controle.

## Publicação

O projeto usa Vite, React e TypeScript e pode ser conectado ao Lovable como um projeto Vite padrão, selecionando a pasta `municipio-inteligente/` como raiz. Confira o runtime e os comandos disponíveis na plataforma antes da publicação. Para build estática, o comando é `npm run build` e a pasta de saída é `dist/`.
