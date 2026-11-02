# Berserkr RPG — Foundry VTT 13 — versão 0.5.0

## Instalação ou atualização manual
1. Feche o Foundry.
2. Faça backup do mundo e guarde a pasta atual do sistema fora de Data/systems.
3. Extraia a pasta berserkr-rpg deste ZIP em Data/systems.
4. Confira o caminho Data/systems/berserkr-rpg/system.json, sem pasta duplicada.
5. Reinicie o Foundry e abra seu mundo Berserkr.
6. Na aba Compêndios, procure os dez packs com prefixo Berserkr.

A versão 0.5.0 acrescenta campos à base 0.4.0 e não exige criar outro mundo. Os protótipos 0.3.x e anteriores não têm migração automática.

O ZIP é para extração manual. A janela Instalar Sistema solicita uma URL de manifesto.

## Usando o conteúdo
- Classes: bônus de criação, fórmulas de PV/Destinos, equipamento e sete links de característica/habilidades.
- Bestiário: importe ou arraste a criatura para o diretório de Atores e use sua ficha. PV, ataques, proteção e poderes já estão cadastrados.
- Equipamentos e Runas: arraste para o inventário do ator. Clique no nome para abrir o Item.
- Runas: feitiço e inscrição têm campos próprios.
- Tabelas: abra o compêndio Tabelas e role a tabela desejada.
- Chat: na ficha do ator, use o botão Chat ao lado do item; na ficha de Item, use Enviar descrição ao chat.

Os bônus de classe são somados a 3d6 durante a criação, antes da conversão. Arrastar a classe não aplica esses bônus diretamente aos atributos finais. As habilidades disponíveis não são concedidas todas juntas: role ou escolha uma, conforme o livro.

## Validação desta entrega
Os dez bancos LevelDB foram compilados com a CLI oficial do Foundry e reabertos. As 332 entradas foram comparadas às fontes JSON, incluindo documentos embutidos. Links, IDs, pastas, ícones, fórmulas de dano, cobertura das tabelas e templates foram verificados. Os templates de todas as entradas de Item e de todas as criaturas foram renderizados com Handlebars.

O registro e o contexto das fichas foram exercitados com uma simulação da API v13. Não houve execução numa instalação real do Foundry; esse teste continua necessário.

## Limites de automação
Testes d20, rolagens de dano, iniciativa individual e gasto manual de Destinos estão implementados. Acertos, redução de armadura, efeitos de Runas, condições, fases de chefes e escolha de habilidades são resolvidos pela mesa. O campo de bônus à CD das defesas dos PJs é uma referência editável, sem aplicação automática.

Dados ambíguos do livro não foram convertidos em regras novas. As condições usam o capítulo principal, com observação das divergências da folha de referência.
