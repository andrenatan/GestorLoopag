import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
  Check, 
  Zap, 
  Shield, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Clock, 
  Headphones,
  ChevronRight,
  Star,
  Sparkles,
  ArrowRight,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";

const features = [
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Cadastre e gerencie todos os seus clientes IPTV em um só lugar, com histórico completo."
  },
  {
    icon: MessageSquare,
    title: "Automação WhatsApp",
    description: "Envie cobranças automáticas e lembretes de vencimento via WhatsApp."
  },
  {
    icon: BarChart3,
    title: "Relatórios Completos",
    description: "Acompanhe métricas de faturamento, renovações e crescimento do seu negócio."
  },
  {
    icon: Clock,
    title: "Cobranças Automáticas",
    description: "Configure horários de cobrança e deixe o sistema trabalhar por você."
  },
  {
    icon: Shield,
    title: "Segurança Total",
    description: "Seus dados protegidos com criptografia de ponta e backups automáticos."
  },
  {
    icon: Headphones,
    title: "Suporte VIP 24/7",
    description: "Equipe dedicada para ajudar você a qualquer momento, todos os dias."
  }
];

const plans = [
  {
    name: "Mensal",
    price: "60",
    period: "/mês",
    popular: false,
    features: [
      "Clientes ilimitados",
      "1 Instância WhatsApp",
      "Cobranças automáticas",
      "Todas as funcionalidades",
      "Relatórios personalizados",
      "Suporte VIP 24/7",
      "Consultoria gratuita"
    ]
  },
  {
    name: "Trimestral",
    price: "150",
    period: "/trimestre",
    popular: true,
    features: [
      "Clientes ilimitados",
      "1 Instância WhatsApp",
      "Cobranças automáticas",
      "Todas as funcionalidades",
      "Relatórios personalizados",
      "Suporte VIP 24/7",
      "Consultoria gratuita"
    ]
  },
  {
    name: "Anual",
    price: "590",
    period: "/ano",
    popular: false,
    features: [
      "Clientes ilimitados",
      "1 Instância WhatsApp",
      "Cobranças automáticas",
      "Todas as funcionalidades",
      "Relatórios personalizados",
      "Suporte VIP 24/7",
      "Consultoria gratuita"
    ]
  }
];

const faqs = [
  {
    question: "Como funciona o período de teste?",
    answer: "Você tem 7 dias para testar todas as funcionalidades do sistema gratuitamente. Não é necessário cartão de crédito para começar."
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim! Você pode cancelar sua assinatura a qualquer momento, sem multas ou taxas adicionais."
  },
  {
    question: "Como funciona a integração com WhatsApp?",
    answer: "Conectamos sua conta do WhatsApp ao sistema via QR Code. A partir daí, todas as cobranças são enviadas automaticamente."
  },
  {
    question: "Quantos clientes posso cadastrar?",
    answer: "Não há limite! Todos os planos oferecem cadastro de clientes ilimitados."
  },
  {
    question: "Preciso de conhecimento técnico?",
    answer: "Não! O Loopag foi desenvolvido para ser simples e intuitivo. Qualquer pessoa consegue usar."
  },
  {
    question: "Como funciona o suporte?",
    answer: "Oferecemos suporte VIP 24/7 via WhatsApp e email. Nossa equipe está sempre pronta para ajudar."
  }
];

export default function SalesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <div className="min-h-screen overflow-x-hidden text-foreground">

      {/* Navigation */}
      <nav className="sticky top-0 z-30 pt-3 sm:pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass flex h-16 items-center justify-between rounded-full pl-3 pr-2 sm:pl-4">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <a href="#" data-testid="link-nav-home" className="flex items-center gap-2 cursor-pointer">
                <div className="brand-tile flex h-10 w-10 items-center justify-center rounded-full">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="font-display text-xl font-bold tracking-tight text-foreground">
                  Loopag
                </span>
              </a>
            </motion.div>
            
            {/* Desktop Navigation */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden sm:flex items-center gap-4"
            >
              <a href="#planos" data-testid="link-nav-planos" className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground">
                Planos
              </a>
              <Link href="/login" data-testid="link-nav-login">
                <Button 
                  data-testid="button-nav-login"
                  variant="ink"
                >
                  Acessar Sistema
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>

            {/* Mobile Menu Button */}
            <button
              data-testid="button-mobile-menu"
              className="sm:hidden flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong mt-2 p-4 sm:hidden"
            >
              <div className="flex flex-col gap-3">
                <a 
                  href="#planos" 
                  data-testid="link-mobile-planos"
                  className="rounded-full px-3 py-2 text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Planos
                </a>
                <Link href="/login" data-testid="link-mobile-login">
                  <Button 
                    data-testid="button-mobile-login"
                    variant="ink"
                    className="w-full"
                  >
                    Acessar Sistema
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-highlight px-4 py-2 text-sm font-semibold text-highlight-foreground">
                <Sparkles className="w-4 h-4" />
                Sistema completo de gestão IPTV
              </span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-balance font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl mb-6"
            >
              Gerencie suas assinaturas IPTV de forma inteligente
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
            >
              Automatize cobranças, gerencie clientes e acompanhe seu faturamento em tempo real. 
              Tudo em uma única plataforma moderna e fácil de usar.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/login" data-testid="link-hero-start">
                <Button 
                  data-testid="button-hero-start"
                  size="lg" 
                  className="h-14 px-8 text-lg shadow-glow"
                >
                  Começar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#planos" data-testid="link-hero-plans">
                <Button 
                  data-testid="button-hero-plans"
                  size="lg" 
                  variant="secondary"
                  className="h-14 px-8 text-lg"
                >
                  Ver Planos
                </Button>
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-6 mt-12 text-muted-foreground text-sm"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                <span>Dados Seguros</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-warning" />
                <span>+500 Revendedores</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span>7 dias grátis</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Ferramentas poderosas para automatizar seu negócio e aumentar sua produtividade
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="relative z-10 py-20 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Escolha o plano ideal para você
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Comece gratuitamente e faça upgrade quando precisar. Todos os planos incluem 7 dias de teste grátis.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative p-6 lg:p-8 ${plan.popular ? "glass-strong border-primary/50 md:scale-105" : "glass"}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-highlight px-4 py-1.5 text-sm font-semibold text-highlight-foreground shadow-float">
                      Mais Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-4">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-muted-foreground">R$</span>
                    <span className="font-display text-5xl font-semibold tracking-tight text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-foreground/85 text-sm">
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/login" data-testid={`link-plan-${plan.name.toLowerCase()}`}>
                  <Button 
                    data-testid={`button-plan-${plan.name.toLowerCase()}`}
                    variant={plan.popular ? "default" : "secondary"}
                    className="h-12 w-full"
                  >
                    Começar Agora
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Perguntas Frequentes
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={faq.question} 
                  value={`faq-${index}`}
                  className="glass border-b-0 px-6 data-[state=open]:border-primary/40"
                >
                  <AccordionTrigger 
                    data-testid={`faq-toggle-${index}`}
                    className="text-left text-lg font-semibold py-6 hover:no-underline text-foreground"
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-strong rounded-panel p-8 text-center lg:p-12"
          >
            <h2 className="text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl mb-4">
              Pronto para automatizar seu negócio?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Junte-se a centenas de revendedores que já transformaram a gestão de suas assinaturas IPTV.
            </p>
            <Link href="/login" data-testid="link-cta-start">
              <Button 
                data-testid="button-cta-start"
                size="lg"
                className="h-14 px-8 text-lg shadow-glow"
              >
                Começar Teste Grátis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-muted-foreground text-sm mt-4">
              7 dias grátis • Sem cartão de crédito • Cancele quando quiser
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="brand-tile flex h-8 w-8 items-center justify-center rounded-full">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-display font-bold tracking-tight text-foreground">
                Loopag
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 Loopag. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
