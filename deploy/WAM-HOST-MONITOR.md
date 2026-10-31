# Conectar métricas reais do WAM ao painel

O painel web roda separado do serviço wam-miner.service. Para ler hashrate, shares, blocos reportados pelo minerador, threads, CPU e logs, instale a ponte local no host Linux.

A ponte é somente leitura: não inicia, interrompe nem altera o minerador. Não publica RPC, cookie do nó nem chaves privadas.

## 1. Instalar no host

Confirme que o host tem Node.js e que o endereço do gateway Docker usado pelo painel é 172.18.0.1. O painel atualmente consulta http://172.18.0.1:9557/status.

    node --version
    ip -4 addr show | grep -E '172\\.18\\.0\\.1'

Se o IP acima não existir, ajuste WAM_MONITOR_BIND no arquivo de serviço para o endereço de gateway correto que o container do painel usa para alcançar o host. Não exponha a porta 9557 publicamente.

Baixe o agente e a unidade:

    curl -fsSL https://raw.githubusercontent.com/TFERRE21/minerar/main/deploy/wam-host-monitor.js -o /opt/wam-host-monitor.js
    curl -fsSL https://raw.githubusercontent.com/TFERRE21/minerar/main/deploy/wam-host-monitor.service -o /etc/systemd/system/wam-host-monitor.service
    chmod 755 /opt/wam-host-monitor.js
    systemctl daemon-reload
    systemctl enable --now wam-host-monitor.service

## 2. Confirmar a ponte

    curl -fsS http://172.18.0.1:9557/health
    curl -fsS http://172.18.0.1:9557/status

O JSON de status deve conter serviceActive, hashrate, validShares, rejectedShares, blocksFound, threads, cpuPercent e threadStats quando as informações estiverem disponíveis no systemd/journal.

## 3. Segurança e interpretação

- O agente escuta somente no IP de bind configurado, por padrão 172.18.0.1, e não deve ser exposto na internet.
- O endpoint lê apenas o estado do serviço, o processo e o journal do wam-miner.service.
- blocksFound reflete o campo blocks reportado pelo próprio minerador; não é uma prova de bloco aceito na blockchain. A confirmação on-chain exige consultar o nó/explorador.
- A altura e a dificuldade vêm da última mensagem de job recebida pelo minerador, não necessariamente da altura sincronizada do nó local.
- O painel não inventa histórico. Para ter gráfico histórico real, é necessário persistir amostras ao longo do tempo; isso será exibido quando houver fonte histórica.
- Saldo pendente e total pago são fornecidos pela API da pool e não equivalem ao saldo confirmado on-chain da carteira.
