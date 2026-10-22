# Crypto Scout — Monitor de oportunidades de mineração

Projeto de monitoramento de mercado e descoberta de moedas que possam ser mineráveis. Esta versão inicial **não executa mineração**: coleta métricas públicas e sinaliza candidatos para validação posterior.

## Objetivos

- Monitorar cotações, volume e capitalização via CoinGecko.
- Tratar campos ausentes sem confundi-los com valores zero.
- Manter histórico local e relatório de candidatos para investigação.
- Evoluir para fontes verificadas de redes Proof of Work, algoritmos e pools.
- Executar como serviço Linux com limites conservadores de recursos.

## Segurança e expectativas

- Não armazene frases-semente, chaves privadas ou senhas neste repositório.
- Não execute código de mineração de terceiros sem revisão e confirmação de que o provedor permite mineração.
- Preço baixo e baixa capitalização não significam rentabilidade.
- O monitor usa dados de mercado; não prova que uma moeda seja minerável nem que uma pool esteja ativa.
- Respeite limites e termos de uso das APIs públicas.

## Requisitos

- Python 3.10+
- Acesso HTTPS à API CoinGecko
- Linux para a configuração de serviço opcional

## Executar

```bash
python3 -m app.scout
```

O histórico e os dados atuais são gravados no diretório configurado por `CRYPTOSCOUT_DATA_DIR` (padrão: `./data`).

## Serviço Linux

Veja `deploy/crypto-scout.service`. Antes de instalar, revise os caminhos e o usuário do serviço. O serviço não inicia mineradores.

## Estado do projeto

Primeira versão: coletor de dados de mercado e base para descoberta de oportunidades. A análise de algoritmos, estado de rede, pools e cálculo de lucro líquido são etapas futuras e devem ser validadas com dados de fontes especializadas.
