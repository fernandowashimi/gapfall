# Especificação — Jogo de blocos em queda

## Problem Statement

O jogador precisa de um jogo arcade de navegador, otimizado para tela de celular em retrato, que una reação rápida e planejamento espacial. Linhas de blocos descem continuamente em um grid de quatro colunas. Cada linha traz um espaço vazio que o jogador deve preencher lançando blocos de baixo para cima antes que qualquer bloco alcance o limite inferior. Um lançamento na coluna errada cria mais blocos a resolver, de modo que erros geram pressão em vez de simplesmente serem ignorados.

## Solution

Entregar uma primeira versão jogável, infinita e local do jogo. O tabuleiro será desenhado em Canvas 2D dentro de uma aplicação React. O jogador usa toque/clique em uma coluna ou as teclas `A`, `S`, `K` e `L` para lançar blocos nas quatro colunas. A velocidade de queda é constante; as linhas são geradas de forma contínua e sem espaçamento vertical.

O jogo mantém uma regra de resolução de baixo para cima: linhas preenchidas só são eliminadas quando todas as linhas abaixo já foram resolvidas. Isso sustenta a regra especial de duas linhas consecutivas com o vazio na mesma coluna: o primeiro disparo preenche a segunda sem removê-la e o segundo disparo elimina as duas em cascata. As linhas removidas deixam lacunas; o tabuleiro não colapsa.

## User Stories

1. Como jogador, quero iniciar uma partida em uma tela de celular em retrato, para jogar sem interface desktop adaptada de forma precária.
2. Como jogador, quero ver uma contagem regressiva de três segundos antes da queda começar, para entender o estado inicial e me preparar.
3. Como jogador, quero ver linhas de quatro colunas descendo continuamente, para compreender imediatamente a ameaça principal.
4. Como jogador, quero que cada nova linha tenha exatamente três blocos e um vazio, para que cada linha apresente um alvo claro.
5. Como jogador, quero que as linhas nasçam encostadas verticalmente, para que o fluxo de obstáculos seja contínuo.
6. Como jogador, quero que o vazio apareça aleatoriamente entre as quatro colunas, para que as decisões não sejam repetitivas.
7. Como jogador, quero que uma mesma coluna não seja o vazio em mais de duas linhas geradas consecutivas, para evitar sequências excessivamente repetitivas.
8. Como jogador, quero disparar um bloco tocando ou clicando em qualquer ponto da coluna desejada, para usar o mesmo gesto natural em mouse e tela sensível ao toque.
9. Como jogador de teclado, quero usar `A`, `S`, `K` e `L`, da esquerda para a direita, para disparar nas quatro colunas com baixa latência.
10. Como jogador, quero que cada toque, clique ou pressionamento físico gere exatamente um disparo, para ter controle preciso sem repetição automática ao segurar uma tecla.
11. Como jogador, quero poder disparar sem cooldown e com vários blocos em voo, para responder rapidamente à pressão visual.
12. Como jogador, quero ver os blocos subirem visivelmente, para que o jogo preserve a sensação de trajetória e tempo de reação.
13. Como jogador, quero que um disparo na coluna vazia possa preencher a linha correspondente, para remover ameaças.
14. Como jogador, quero que um disparo em uma coluna ocupada se acumule abaixo da colisão, para que uma decisão errada tenha consequência estratégica clara.
15. Como jogador, quero poder completar linhas parciais criadas por meus próprios erros, para recuperar o controle da partida.
16. Como jogador, quero que linhas completas sejam removidas imediatamente quando se tornarem elegíveis, para receber retorno instantâneo pela jogada correta.
17. Como jogador, quero que a elegibilidade de remoção respeite a ordem de baixo para cima, para que linhas superiores não sejam apagadas como atalho enquanto há problemas abaixo.
18. Como jogador, quero que dois vazios consecutivos na mesma coluna sejam resolvidos por dois disparos naquela coluna, para que esse padrão crie uma microdecisão especial.
19. Como jogador, quero que a segunda linha do par possa ficar preenchida até a primeira ser resolvida, para que a cascata seja visualmente compreensível.
20. Como jogador, quero que a remoção de linhas deixe lacunas em vez de puxar o conteúdo superior para baixo, para que as trajetórias e o ritmo contínuo permaneçam previsíveis.
21. Como jogador, quero que todos os blocos existentes descendam juntos a velocidade constante, para que o estado do tabuleiro seja coerente.
22. Como jogador, quero salvar a partida com uma ação no último instante, para que o jogo pareça justo quando disparo e derrota ocorrem no mesmo frame.
23. Como jogador, quero perder quando qualquer bloco toca o limite inferior do campo jogável, para que a condição de derrota seja inequívoca.
24. Como jogador, quero ver a pontuação aumentar por linhas removidas e por cascatas, para que jogadas eficientes tenham valor visível.
25. Como jogador, quero que uma remoção dupla valha três pontos, para que a regra especial de sequência tenha recompensa clara.
26. Como jogador, quero uma partida infinita e recorde local, para tentar superar meu desempenho sem uma condição de vitória artificial.
27. Como jogador, quero que a partida pause automaticamente ao ocultar a aba ou perder foco, para não perder por limitação do navegador.
28. Como jogador, quero retomar uma partida pausada conscientemente, para não recomeçar o tempo sem estar pronto.
29. Como futuro usuário de ranking, quero que o resultado da partida possa ser serializado, para que uma API possa registrar pontuações posteriormente.
30. Como futuro jogador de duelo, quero regras simuláveis fora da interface, para que o estado possa ser sincronizado por rede sem depender de React ou do Canvas.
31. Como equipe de produto, queremos trocar retângulos por sprites sem reescrever a lógica do jogo, para evoluir a apresentação com segurança.

## Implementation Decisions

- A aplicação usa React para telas, HUD, pausa, game over e futuro perfil/ranking. React não representa cada bloco como componente nem controla o frame loop por re-renderização.
- Um Canvas 2D nativo é responsável por desenhar o campo, blocos, disparos e, futuramente, sprites. O loop usa `requestAnimationFrame`, com limpeza ao desmontar e ao pausar.
- O jogo usa uma resolução lógica fixa de 360 × 800, em aspecto 20:9, escalada proporcionalmente para a área disponível. A parte inferior é reservada ao lançador e controles de referência.
- O campo possui quatro colunas de 90 px. Cada bloco mede 90 × 45 px, isto é, dois blocos de largura para uma altura.
- A simulação é contínua em coordenadas de tela: o tabuleiro desce uma altura de bloco por segundo (45 px/s) e os disparos sobem doze alturas de bloco por segundo (540 px/s). A renderização pode interpolar, mas a simulação é a fonte de verdade.
- A primeira linha inicia no topo e a partida permanece em preparação por três segundos. Após isso, linhas são criadas no topo a cada uma altura de bloco de deslocamento, formando um fluxo contínuo sem espaço vertical.
- Cada linha gerada tem quatro slots, três ocupados e um vazio. O slot vazio é aleatório e independente, exceto pelo limite de no máximo duas ocorrências consecutivas na mesma coluna.
- Cada entrada discreta emite um lançamento na coluna correspondente. Não há cooldown, limite de disparos em voo nem repetição por manter a tecla pressionada.
- Cliques/toques na área jogável são convertidos para a coluna correspondente. O teclado mapeia `A`, `S`, `K`, `L` para as colunas 0 a 3, respectivamente, somente durante uma partida ativa.
- O domínio terá vocabulário explícito: **linha gerada** (a linha de três blocos do fluxo), **linha parcial** (linha criada ou modificada por disparos), **linha frontal** (a linha ainda não resolvida mais baixa no ordenamento), **cascata** (remoções desencadeadas pela mesma ação) e **disparo** (bloco em subida).
- Um disparo que encontra uma coluna ocupada fica acumulado imediatamente abaixo do obstáculo, participando de uma linha parcial. Um disparo que encontra vazio segue a regra de ordenamento de resolução, em vez de permitir eliminar livremente uma linha superior.
- A remoção é processada de baixo para cima. Uma linha completa somente pode ser removida depois de as linhas abaixo estarem removidas ou resolvidas. Caso duas linhas consecutivas tenham o vazio na mesma coluna, o primeiro disparo nessa coluna atravessa a primeira e preenche a segunda; a segunda aguarda. O próximo disparo preenche a primeira e remove ambas em cascata.
- Linhas completas elegíveis são removidas imediatamente. A remoção não aplica gravidade local: a lacuna permanece enquanto o tabuleiro inteiro continua descendo.
- Em cada atualização, entradas, trajetória, colisões, preenchimentos e cascatas são resolvidos antes da checagem de derrota. A partida termina se qualquer bloco alcançar o limite inferior do campo após essa resolução.
- A pontuação é de um ponto por linha eliminada, mais um ponto para cada linha adicional na mesma cascata. Portanto, uma cascata de duas linhas vale três pontos.
- A primeira versão é infinita e persiste o recorde local. Ao perder foco ou com a aba oculta, a partida é pausada e exige retomada explícita.
- A separação arquitetural é obrigatória: um **núcleo de jogo** sem React, Canvas ou rede; um **renderer Canvas** que consome o estado; e uma **aplicação React** que controla telas e entradas. O núcleo deve expor estado e comandos serializáveis, mantendo caminho aberto para ranking remoto e duelo em tempo real.

## Testing Decisions

- A seam principal, e idealmente única para regras, será a API pública do núcleo de jogo: criar estado inicial, aplicar uma entrada de disparo e avançar a simulação por um delta de tempo. Testes devem observar apenas estado/efeitos publicamente observáveis, não detalhes do Canvas ou estrutura interna de coleções.
- O núcleo deve ser testado de forma determinística, com fonte de aleatoriedade injetável ou sequência de vazios controlada. Isso permitirá testar o limite de duas repetições e cenários de colisão sem flutuação.
- Devem existir testes de geração contínua, composição 3+1 das linhas, limite de repetição de vazio, velocidade de queda, velocidade de disparo e mapeamento de coluna.
- Devem existir testes de comportamento para disparos em vazio, disparos em slot ocupado, criação e preenchimento de linhas parciais, remoção imediata elegível e ausência de colapso após remoção.
- Devem existir testes específicos para a prioridade inferior: uma linha superior completa não remove antes de a inferior; no par de vazios iguais, o primeiro disparo preenche a segunda sem removê-la e o segundo elimina ambas; a pontuação da cascata dupla é três.
- Devem existir testes para a ordem de atualização no limite inferior, demonstrando que uma remoção no mesmo frame pode evitar derrota e que a derrota ocorre quando ainda resta bloco no limite após as resoluções.
- Devem existir testes de integração na aplicação para `A/S/K/L`, clique/toque por coluna, ausência de repetição ao segurar tecla, pausa por visibilidade/foco e transições de preparação, jogo, pausa e game over.
- Como o repositório está vazio, não há testes ou seam preexistentes a preservar. O núcleo de jogo é deliberadamente a seam mais alta para cobrir a maior parte do comportamento com poucos testes acoplados à UI.

## Out of Scope

- Multiplayer em tempo real, pareamento, sincronização de rede, rollback e servidor autoritativo.
- Login, perfil de usuário, amizade, ranking remoto e mecanismos de prevenção de fraude; o recorde local é suficiente para a primeira versão.
- Arte final, sprites finais, áudio, partículas, animações complexas e pipeline de assets. O renderer deve, contudo, aceitar sprites futuramente.
- Aceleração progressiva de dificuldade; nesta versão a velocidade é constante.
- Power-ups, tipos diferentes de blocos, modos de fase, campanhas e condição de vitória.
- Migração para motor de jogo ou renderer WebGL. Canvas 2D é a escolha inicial.

## Further Notes

- A escolha de Canvas 2D não limita a evolução visual: sprites podem substituir o desenho de retângulos no renderer sem mudar o núcleo.
- Ranking e perfil podem ser acrescentados como serviços da aplicação; o núcleo serializável evita que essas integrações contaminem as regras locais.
- Para duelos futuros, o cliente deve renderizar estado do núcleo, não ser a autoridade das regras. O contrato exato de rede será definido em uma especificação própria.
- Esta especificação ainda não foi publicada em issue tracker porque o repositório local não possui remoto nem destino de issues configurado.
