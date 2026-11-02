# Validação v0.9.0 — 6 de outubro de 2026

## Gerador e temas v0.9.0
- Testada a impossibilidade de avançar sem habilidade, atributos, recursos ou equipamento válido.
- Finalização exige a última etapa, nome e todas as escolhas válidas.
- Rascunho inconsistente é reposicionado para a primeira etapa incompleta.
- Dados do personagem incluem o tema da classe; templates do gerador renderizados nas cinco etapas para as dez classes.
- Dez fichas temáticas renderizadas com os templates reais e API simulada; vinte PNGs conferidos.
- Chromium verificou dez escolhas de classe, cinco etapas informativas, ausência de botão de finalização na primeira etapa, imagens e largura.
- Os 332 registros de compêndios e os testes anteriores de regras foram verificados novamente.
- Integração dentro de uma instalação real do Foundry VTT 13 ainda não executada.

- Análise sintática dos nove módulos JavaScript: aprovada.
- Testes com API simulada: conversão de atributos nos limites, vantagem cancelada, crítico/desastre e anulação, cura limitada, dano mínimo zero, armadura e sobrecarga na CD, consumo de bônus, acerto automático, bloqueio, redução de dano, expiração e fadiga, Destinos sem saldo.
- Gerador: dados completos e renderização das cinco etapas para as dez classes; itens sem IDs copiados, uma classe, contagem de runas e suprimentos.
- 332 entradas dos compêndios: bases LevelDB reabertas pela CLI oficial e comparadas às fontes JSON; links, pastas, ícones e intervalos das tabelas verificados. Templates de todos os itens e criaturas renderizados.
- Integração real com Foundry VTT 13 ainda não executada. Verifique no mundo: gerar personagem, arrastar item, equipar armadura, atacar alvo selecionado, aplicar dano pelo chat, rolar Aparar, conjurar e inscrever runa, avançar turnos, descansar, salvar e reabrir ficha.

## Verificação artística
- Campos editáveis e ações anteriores preservados no template.
- Todos os recursos PNG e referências CSS existem.
- Renderização real em Chromium: nenhuma imagem ausente ou erro de JavaScript; campos e ações preservados na ficha de exemplo.
- Layout verificado em 960px e 660px sem transbordamento horizontal.
- Snapshot em PNG com resolução dupla da interface; integração visual no Foundry ainda não executada.

## Navegação por abas v0.8.0
- Cinco abas testadas em Chromium por clique, setas, Home e End.
- Exatamente um painel visível por vez; recursos superiores continuam visíveis.
- Texto digitado em Saga preservado ao visitar todas as outras abas.
- Equipamentos não contém runas nem habilidades; contadores e cartões usam os documentos dos compêndios.
- Layout testado em 960/660px de largura e área de ficha com 620px de altura; sem transbordamento horizontal.
- Previews das abas foram capturadas dos templates e CSS entregues; não são capturas dentro do Foundry.
- Os 332 registros foram recompilados e reabertos com a CLI oficial, e os testes anteriores de regras passaram novamente.
