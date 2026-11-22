/**
 * Dicionário local de prenomes brasileiros frequentes (normalizados: minúsculos,
 * sem acento). Base para a detecção de nomes de pessoas SEM IA — requisito de
 * privacidade do NexIA: nenhum trecho de texto é enviado a modelo para "achar nomes".
 *
 * A detecção é heurística (prenome conhecido + sobrenome(s) capitalizado(s)) e
 * por isso passa pela revisão humana na aba "Anonimizar". Prenomes que também são
 * palavras comuns foram deixados de fora quando o risco de falso positivo é alto.
 */

const PRENOMES_LISTA = `
aaron abel abigail abilio abner abraao acacio ada adailton adalberto adalgisa adao adelaide adelia adelina adelino
ademar ademir adenilson adilson adir adolfo adonias adriana adriane adriano adriele aecio afonso agatha agenor
agnaldo agnes agostinho aguinaldo aida ailton aimee alan alana alba alberto albertina alcides alcione alda aldair
aldo aldenora alecsandro alessandra alessandro alex alexandra alexandre alexandrina alexia alfredo alice alicia aline
alisson allan almir alois aloisio altair alvaro alzira amalia amanda amaro amauri amelia americo ana anabela anderson
andrea andreia andressa andreza andre angela angelica angelina angelo anibal anita anselmo antonia antonieta antonio
aparecida aparecido apolonia araci arcanjo ari ariane ariel arlete arlindo armando arnaldo arthur artur aruan
assis astrid atila augusto aurea aurelio aurora avelino ayla barbara bartolomeu batista beatriz benedita benedito
benicio benjamin bento bernadete bernardo berenice betania bianca brenda breno bruna bruno caio camila camilo candida
carla carlos carmem carmen carolina caroline cassandra cassia cassio catarina cecilia celia celina celio celso cesar
charles christian cicera cicero cintia ciro clara clarice claudia claudio cleber clelia clemente cleonice cleide
cleiton clodoaldo cloves conceicao cosme cristian cristiane cristiano cristina damiao daiane daniel daniela danielle
danilo dante dario davi david debora deise denise dennis derick diana diego dilma dinora diogo dirce domingos
dora doralice dorival douglas dulce durval edgar edilene edileuza edilson edinaldo edite edmilson edna edson eduarda
eduardo elaine elba eleonora eliana eliane elias elisa elisabete elisangela eliseu elizabeth elizete eloa eloisa
elton elvira ema emanuel emanuela emanuele emerson emilia emilio emily enzo erasmo eric erica erick erika ernesto
estela ester estevao eugenio eunice eva evandro evaristo evelyn everaldo everton ezequiel fabiana fabiano fabio
fabiola fabricio fatima felicia felipe felix fernanda fernando filipe flavia flavio florencio francine francisca
francisco franciele franklin frederico gabriel gabriela gabriele gael genival georgina geraldo gerson getulio
gilberto gilda gilmar gilson giovana giovanna giovani giovanni gisele giselle glauber glaucia graciele gregorio
guilherme gustavo haroldo heitor helder helena helio heloisa henrique herbert herminio hilda hugo humberto iara
icaro ieda igor ilda ines ingrid iolanda irene iris irma isaac isabel isabela isabella isabelle isadora isaias
isis israel itamar ivan ivana ivete ivo ivone jacinto jaco jacqueline jade jaime jair jairo janaina jandira janete
jaqueline jardel jean jefferson jeferson jennifer jessica joana joao joaquim joel joelma jonas jonatas jonathan jorge
josafa jose josefa josefina joseane josiane josias josue juan judite julia juliana juliano julio jurandir juscelino
jussara karen karina karla kaique kamila katia kauan kaue keila kelly kevin laercio laila lara larissa laura lauro
lavinia layla lazaro leandra leandro leila lenira leonardo leonel leonor leticia levi lidia ligia lilian liliane
lindalva livia lorena lorenzo lourdes luan luana lucas lucia luciana luciano lucimar lucineide lucio luis luisa
luiz luiza lurdes manoel manuel manuela marcela marcelo marcia marciano marcio marco marcos margarete margarida maria
mariana mariane marilda marilene marilia marina mario marisa marlene marli marta martim martin mateus matheus
matilde mauricio mauro max maximiliano mayara mayra melissa michel michele micheli miguel milena milton miriam
moacir moises monica murilo nadia nair natalia natan nathalia nayara neide nelson ney nicolas nicole nilda nilson
nilton noemi norma odete olavo olga olivia orlando osmar osvaldo otavio otto pablo pamela patricia paula paulina
paulo pedro pietra pietro poliana priscila priscilla rafael rafaela raimunda raimundo raissa ramon raquel raul
rayane rebeca regiane regina reginaldo reinaldo renan renata renato ricardo rita roberta roberto robson rodolfo
rodrigo rogerio romario romeu ronaldo rosana rosangela rosangela roseane rosely rosemary rosilene rubens rui ruth
sabrina salete salvador samanta samara samuel sandra sandro sara sarah sebastiana sebastiao selma sergio severina
severino sheila silas silvana silvano silvia silvio simone sofia solange sonia sophia stefany stella suelen sueli
susana suzana taina talita tamara tania tatiana tatiane telma teodoro teresa tereza thais thalita thiago thomas
tiago tomas tomaz tulio uelington ulisses valdemar valdir valentina valeria valmir valter vanda vanderlei vanessa
vania vera veronica vicente victor vilma vinicius violeta virginia vitor vitoria viviane wagner waldemar walter
wanderley wanessa washington welington wellington wendel wesley weslley wilma wilson yara yasmin yuri zelia zilda
zuleide
`;

export const PRENOMES: ReadonlySet<string> = new Set(PRENOMES_LISTA.split(/\s+/).filter(Boolean));

/** Partículas que podem ligar partes de um nome. */
export const PARTICULAS: ReadonlySet<string> = new Set(['da', 'de', 'do', 'das', 'dos', 'e', "d'"]);

/**
 * Palavras que, mesmo capitalizadas logo após um prenome, indicam que NÃO se trata
 * de pessoa (instituições, logradouros, eventos, leis). Normalizadas.
 */
export const PALAVRAS_NAO_NOME: ReadonlySet<string> = new Set([
  'hospital', 'clinica', 'escola', 'colegio', 'universidade', 'faculdade', 'instituto', 'fundacao', 'associacao',
  'igreja', 'paroquia', 'capela', 'rua', 'avenida', 'travessa', 'praca', 'rodovia', 'bairro', 'edificio', 'condominio',
  'tribunal', 'vara', 'comarca', 'forum', 'camara', 'assembleia', 'secretaria', 'ministerio', 'prefeitura', 'governo',
  'estado', 'municipio', 'distrito', 'lei', 'decreto', 'portaria', 'resolucao', 'sumula', 'tema', 'artigo', 'codigo',
  'banco', 'caixa', 'empresa', 'ltda', 'eireli', 'cia', 'companhia', 'grupo', 'shopping', 'mercado', 'farmacia',
  'laboratorio', 'santa', 'santo', 'sao', 'nossa', 'senhora', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio',
  'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro', 'segunda', 'terca', 'quarta', 'quinta',
  'sexta', 'sabado', 'domingo', 'cep', 'cpf', 'cnpj', 'rg', 'oab', 'crm', 'n', 'no', 'nº'
]);

/** Expressões compostas por prenome que NÃO são pessoas (cidades, leis, logradouros notórios). */
export const EXPRESSOES_NAO_PESSOA: ReadonlySet<string> = new Set([
  'maria da penha', 'joao pessoa', 'vitoria da conquista', 'paulo afonso', 'teotonio vilela', 'getulio vargas',
  'juscelino kubitschek', 'pedro ii', 'pedro i', 'santos dumont', 'rui barbosa', 'joaquim nabuco', 'tiradentes',
  'washington luis', 'marechal deodoro', 'floriano peixoto', 'jose de alencar', 'carlos chagas', 'oswaldo cruz',
  'vital brazil', 'joao alfredo', 'teresa cristina', 'isabel de braganca', 'ana neri', 'ana nery', 'celso furtado'
]);

export function normalizarToken(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
