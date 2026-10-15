
# Município Inteligente — Sistema de Análise Contábil e Financeira Municipal com Inteligência Artificial

## 1. Apresentação

O **Município Inteligente** é um projeto acadêmico desenvolvido para a disciplina de **IA Voltada a Negócios**, com o objetivo de aplicar inteligência artificial à análise de documentos contábeis, orçamentários e fiscais da administração pública municipal.

A proposta é desenvolver um sistema simples e intuitivo que permita enviar demonstrativos em PDF, extrair informações relevantes, calcular indicadores, identificar possíveis inconsistências e gerar diagnósticos com apoio da inteligência artificial.

## 2. Problema

A análise das demonstrações contábeis e fiscais municipais exige tempo, conhecimento técnico e conferência de informações presentes em diferentes documentos.

A conferência manual pode dificultar a identificação de divergências entre demonstrativos e atrasar a elaboração de relatórios gerenciais.

O sistema busca facilitar esse processo por meio da automação da leitura documental, da realização de cálculos e da geração de análises que auxiliem a tomada de decisão.

## 3. Objetivo geral

Desenvolver uma aplicação que utilize inteligência artificial e técnicas de processamento de documentos para auxiliar na análise contábil, orçamentária, financeira e fiscal dos municípios.

## 4. Objetivos específicos

- Permitir o envio de múltiplos documentos em PDF.
- Extrair informações relevantes dos demonstrativos.
- Permitir a conferência e a correção dos dados extraídos.
- Calcular indicadores contábeis, orçamentários e fiscais.
- Identificar possíveis divergências entre documentos.
- Gerar gráficos e indicadores de fácil compreensão.
- Utilizar inteligência artificial para elaborar diagnósticos e recomendações.
- Disponibilizar relatórios para consulta e exportação em PDF.

## 5. Documentos analisados

O sistema será projetado para trabalhar com os seguintes documentos:

1. Balanço Patrimonial (BP).
2. Balanço Orçamentário (BO).
3. Balanço Financeiro (BF).
4. Demonstração das Variações Patrimoniais (DVP).
5. Demonstrativo do Movimento Numerário.
6. Memorial de Restos a Pagar.
7. Demonstrativo da Despesa com Pessoal.
8. Demonstrativo da Receita Corrente Líquida (RCL).

## 6. Funcionalidades previstas

### 6.1. Importação de documentos

- Envio de um ou vários arquivos PDF.
- Identificação do tipo de demonstrativo.
- Extração automática de texto e valores, quando tecnicamente possível.
- Indicação de informações que necessitam de conferência manual.

### 6.2. Análise contábil e financeira

- Cálculo de indicadores selecionados.
- Análise da situação patrimonial e financeira.
- Verificação de resultados orçamentários.
- Análise dos restos a pagar.
- Comparação de informações entre demonstrativos.
- Identificação de possíveis inconsistências e dados ausentes.

### 6.3. Análise fiscal

- Análise da Receita Corrente Líquida.
- Análise da despesa com pessoal.
- Comparação com os limites legais aplicáveis, considerando o período e o ente ou Poder correspondente.
- Apresentação dos percentuais e das bases de cálculo utilizadas.

### 6.4. Inteligência artificial

A inteligência artificial será utilizada para transformar os resultados das análises em explicações objetivas e compreensíveis.

Entre as aplicações previstas estão:

- Elaboração de diagnósticos financeiros.
- Explicação dos principais indicadores.
- Identificação de pontos que merecem atenção.
- Sugestões de medidas administrativas.
- Geração de resumos gerenciais.

As recomendações deverão utilizar os dados efetivamente extraídos e validados. A inteligência artificial não deverá inventar valores nem classificar automaticamente uma divergência como irregularidade.

### 6.5. Relatórios

- Painel resumido dos resultados.
- Exibição de indicadores e gráficos simples.
- Relação de possíveis inconsistências.
- Diagnóstico textual.
- Exportação do resultado da análise em PDF.

## 7. Aplicação da inteligência artificial nos negócios

O projeto demonstra como a inteligência artificial pode contribuir para a modernização da gestão pública, reduzindo tarefas manuais e facilitando o acesso a informações gerenciais.

A ferramenta poderá auxiliar contadores, gestores públicos, controladores internos e profissionais responsáveis pelo acompanhamento das contas municipais.

A tecnologia será utilizada como apoio à análise profissional, sem substituir a conferência dos documentos, a avaliação técnica ou a responsabilidade dos agentes públicos.

## 8. Tecnologias previstas

As tecnologias poderão ser ajustadas durante o desenvolvimento.

- **React:** construção da interface.
- **TypeScript:** desenvolvimento com tipagem.
- **Vite:** ambiente de desenvolvimento.
- **Tailwind CSS:** estilização da aplicação.
- **PDF.js:** leitura e extração de texto de arquivos PDF.
- **Recharts:** criação de gráficos.
- **Biblioteca de geração de PDF:** exportação dos relatórios.
- **Inteligência artificial generativa:** elaboração de diagnósticos, quando houver integração disponível.

O projeto prioriza uma interface simples, com fundo branco, tons de azul e elementos visuais discretos.

Sempre que possível, os documentos deverão ser processados localmente. Caso seja necessária uma API externa de inteligência artificial, deverão ser avaliadas a privacidade dos dados, a segurança e as condições de uso do serviço.

## 9. Metodologia de análise

O funcionamento proposto segue as etapas abaixo:

1. Importação dos demonstrativos em PDF.
2. Identificação dos documentos.
3. Extração dos dados disponíveis.
4. Conferência e validação das informações extraídas.
5. Cálculo dos indicadores.
6. Cruzamento das informações entre os demonstrativos.
7. Identificação de possíveis divergências.
8. Geração de diagnóstico com apoio da inteligência artificial.
9. Emissão do relatório final.

Os cálculos objetivos deverão ser realizados por regras programadas. A inteligência artificial será utilizada principalmente para interpretar e explicar os resultados, mantendo a rastreabilidade dos valores utilizados.

## 10. Referências técnicas

O desenvolvimento deverá considerar, conforme a aplicabilidade ao demonstrativo e ao período analisado:

- Manual de Contabilidade Aplicada ao Setor Público (MCASP).
- Plano de Contas Aplicado ao Setor Público (PCASP).
- Normas Brasileiras de Contabilidade Aplicadas ao Setor Público (NBC TSP).
- Lei Complementar nº 101/2000 — Lei de Responsabilidade Fiscal (LRF).
- Manual de Demonstrativos Fiscais (MDF).
- Demais normas e orientações oficiais pertinentes à contabilidade pública municipal.

## 11. Execução do projeto

Após a criação do repositório e a configuração do ambiente, os comandos previstos para execução local são:

```bash
git clone URL_DO_REPOSITORIO
cd municipio-inteligente
npm install
npm run dev
```

**Observação:** substitua `URL_DO_REPOSITORIO` pelo endereço real do repositório. Os comandos e as dependências deverão ser ajustados à estrutura efetivamente criada no projeto.

## 12. Público-alvo

- Contadores públicos.
- Controladores internos.
- Gestores municipais.
- Assessores contábeis.
- Profissionais de auditoria e consultoria.
- Estudantes e pesquisadores de Administração, Contabilidade e Finanças Públicas.

## 13. Status do projeto

**Em desenvolvimento.**

As funcionalidades descritas representam a proposta do projeto. Sua disponibilidade dependerá da implementação, dos testes e da validação dos resultados.

## 14. Autor

**Patrik Silva**

Contador | Perito Contábil Judicial | Analista CNPI

- GitHub: https://github.com/Patrik9207

## 15. Licença

A licença do projeto será definida conforme a finalidade acadêmica e as condições de distribuição do código.
