import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'CBC Casper Consensus',
    Svg: require('@site/static/img/asi-consensus-flow.svg').default,
    description: (
      <>
        Proof-of-stake consensus with 30-second block times, multi-parent DAG 
        structure for concurrent processing, and finality guarantees for secure 
        value exchange.
      </>
    ),
  },
  {
    title: 'AI Alliance Network',
    Svg: require('@site/static/img/asi-ai-nodes-animation.svg').default,
    description: (
      <>
        Unified blockchain infrastructure connecting Fetch.ai, SingularityNET, 
        Ocean Protocol, and CUDOS for seamless AI agent collaboration and 
        decentralized superintelligence.
      </>
    ),
  },
  {
    title: 'Production Ready',
    Svg: require('@site/static/img/asi-blockchain-animation.svg').default,
    description: (
      <>
        100% test success rates, comprehensive monitoring with Prometheus/Grafana, 
        automated maintenance tooling, and security-hardened infrastructure for 
        enterprise deployment.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
