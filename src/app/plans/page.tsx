import Link from "next/link";
import {VetoMark} from "@/components/VetoMark";
import {SportAppearanceToggle} from "@/components/SportAppearanceToggle";
import "./plans.css";

const plans=[
  {name:"FREE",price:"$0",unit:"/ мес",tag:"ДОСТУПЕН",description:"Понимать спорт и видеть реальные ограничения данных.",features:["Реальные сохранённые матчи и источник","Радар свежести и статуса рынков","Автономные гипотезы: открытый обзор"],enabled:true,featured:false},
  {name:"DAY PASS",price:"$1.99",unit:"/ 48 часов",tag:"КОНЦЕПТ",description:"Короткий доступ без месячной подписки.",features:["Расширенные просмотры исследований","История сопоставимых игровых состояний","Без обещаний сигналов или выигрыша"],enabled:false,featured:false},
  {name:"INTELLIGENCE",price:"$14.90",unit:"/ мес",tag:"КОНЦЕПТ",description:"Персональные исследования и объяснения матчей.",features:["Настраиваемый радар исследовательских идей","Разбор источника, времени и котировок","История решений и уведомления"],enabled:false,featured:true},
  {name:"PRO LAB",price:"$39",unit:"/ мес",tag:"КОНЦЕПТ",description:"Для тех, кто проверяет стратегии, а не покупает обещания.",features:["Расширенный Paper Trading Lab","Паспорта исследований и оценка выборки","Экспорт исследовательских результатов"],enabled:false,featured:false}
];
export default function SportPlans(){
 return <main className="sportPlans">
  <header className="plansNav">
    <Link className="plansBrand" href="/"><VetoMark size={29}/><strong>VETO <span>SPORT</span></strong></Link>
    <div><SportAppearanceToggle/><Link href="/">← Вернуться к матчам</Link></div>
  </header>
  <div className="plansIntro"><small>VETO SPORT / FAIR ACCESS / PRODUCT ROADMAP</small>
   <h1>Платить за интеллект.<br/><em>Не за обещания.</em></h1>
   <p>Мы проектируем доступную подписку на проверяемую спортивную аналитику. Ни один тариф не продаёт гарантированные победы, готовые ставки или недоступные данные.</p>
   <div className="plansWarning"><b>Важное уточнение:</b> сейчас это проект ценовой модели. Платные тарифы и списания не запущены. Доступна бесплатная исследовательская версия.</div>
  </div>
  <section className="plansGrid" aria-label="Предлагаемые планы">{plans.map(plan=><article className={`plansCard ${plan.featured?"featured":""}`} key={plan.name}>
    <div className="plansCardHead"><span>{plan.name}</span><small>{plan.tag}</small></div>
    <div className="plansPrice"><strong>{plan.price}</strong><span>{plan.unit}</span></div>
    <p>{plan.description}</p>
    <div className="plansDivider"/>
    <ul>{plan.features.map(feature=><li key={feature}><span aria-hidden>✓</span>{feature}</li>)}</ul>
    {plan.enabled?<Link className="plansAction active" href="/">Открыть бесплатную версию ↗</Link>:<div className="plansAction disabled" aria-label="Тариф пока не доступен">Платный доступ ещё не открыт</div>}
   </article>)}</section>
  <section className="plansEthics">
    <div><small>TRUST BY DESIGN</small><h2>No Data — No Charge.</h2><p>Наш принцип будущих разовых анализов: прежде чем брать оплату, подтверждать наличие нужных данных. Если источник не позволяет выполнить заявленный анализ, мы не должны взимать плату за него.</p></div>
    <div><small>DISCOVERY IS VERIFIABLE</small><h2>Каждая цифра с происхождением.</h2><p>История событий, источник, метка времени и ограничения модели должны оставаться доступными независимо от тарифа. Плата — за глубину инструмента, а не за сокрытие ошибок.</p></div>
  </section>
  <div className="plansFooter"><span>VETO SPORT · MARGARYAN LABS</span><Link href="/research/discovery">Исследовательская лаборатория ↗</Link></div>
 </main>
}