# Roadmap

- [x] Substituir o fundo pelo último restaurante enviado, otimizado para 9,2 MB, e verificar visibilidade do Zoord.
- [x] Centralizar Zoord no círculo, logo na parede quadrada atrás do caixa e cérebro alto e visível.

- [x] Zoord dentro do restaurante no piso circular original com LEDs, cérebro acima e logo Dakkai lateral; pés alinhados ao piso (0,300), telas ampla/estreita conferidas, quatro testes aprovados e sem erros.
- [x] Integrar restaurante 3D enviado ao palco Dakkai, otimizado de 73 MB para 4,7 MB; avatar e cardápio lateral conferidos sem erros.
- [x] Cadastro/login com e-mail, Google e Lovable; nome e preferências privados salvos; gravação, recarga e saída verificadas em conta real.

- [x] Primeira etapa ZOORD SECURITY: painel restrito reaproveitado, cadastro Tapo C200, status por imagem recebida e eventos ao vivo; palco/voz/IA preservados. 14 testes aprovados e acesso sem login bloqueado.
- [ ] Validar cadastro e eventos na conta do responsável — sessão de teste indisponível; entrar pelo preview para conferir gravação/leitura autenticadas.
- [ ] Testar uma Tapo C200 real — aguarda câmera e ponte local protegida; não expor portas ou credenciais.

- [x] Abrir conversa e perguntas para assuntos gerais sem forçar cardápio; contexto preservado, modelos/voz mantidos e testes de encaminhamento aprovados.
- [ ] Conferir conversa geral com IA real — acesso atual aos provedores depende de créditos; testes locais não substituem chamada real.
- [x] Fonte musical definida: usuário escolheu manter rádios gratuitas por enquanto, sem nova API paga.
- [x] Painel de gêneros: seleção muda rádio, perfil e introdução falada pelo controlador compartilhado; cinco rádios conectaram na verificação.
- [x] Painel de gestos: aceno, boas-vindas, concordar, apontar e repouso; verificado com zero acessos ao microfone.
- [x] Perfis limitados e dança durante fala com testes; boca de áudio PCM corrigida e conferida com áudio de teste, sem atribuir fonemas.
- [ ] Ouvir introduções com a voz aprovada em aparelho real — teste visual usou áudio local, sem contornar bloqueios de créditos.

- [x] Adicionar nomes, rádios e comandos para forró, pagode, sertanejo e hip-hop; cinco perfis de dança distintos com testes de silêncio e postura.
- [ ] Confirmar estabilidade contínua de Forró e Hip-hop — depende das transmissões externas; Forró conectou sem amplitude medida e Hip-hop reproduziu, mas falhou nas últimas tentativas.
- [x] Rádio gratuita: cinco estações reproduzidas no navegador, ritmo pelo áudio e pausa zerando movimento; comandos e tchau com testes.
- [ ] Validar pedidos musicais e tchau por microfone real — requer aparelho com voz/escuta disponíveis.

- [x] Remover linha azul da boca e encaixar a abertura nos lábios originais.

- [x] Corrigir encaixe da boca e pausas da voz gratuita; conferido com reprodução medida
- [x] Corrigir rotação das pernas ao apresentar Hot Roll; pernas sem rotação/translação durante teste com áudio

- [x] Voz grátis: free-speech, free-listen, menu-script, Groq server; LiveZoord reescrito; AskZoord fallback
- [x] Apresentação grátis do cardápio validada (roteiro local com preços reais)
- [x] GROQ_API_KEY salva pelo usuário (formato gsk_); valor ainda não propagou ao servidor local — validar quando propagar/publicar
- [x] Grok (xAI) integrado: cérebro grok-4.7 (/v1/responses) e voz /api/zoord-voice com boca dirigida por áudio real
- [x] Cadeia de reserva automática: gateway → Grok → Groq → grátis; conexão presa >12s cai para o modo grátis
- [x] Browser: chip "Voz grátis do navegador ativa" aparece, palco sem erros
- [x] Build OK
- [ ] Conta xAI sem créditos (403): quando o usuário recarregar créditos na xAI, voz e cérebro Grok ativam sozinhos
- [ ] Validar voz/escuta grátis em aparelho real (microfone e vozes do navegador)
