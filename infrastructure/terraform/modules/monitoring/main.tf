# Monitoring Module for ASI Chain
# Comprehensive monitoring with Prometheus, Grafana, and CloudWatch

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project}-${var.environment}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/EKS", "cluster_node_count", { stat = "Average" }],
            [".", "cluster_failed_node_count", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "EKS Cluster Nodes"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            [".", "DatabaseConnections", { stat = "Average" }],
            [".", "FreeStorageSpace", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Database Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", { stat = "Average" }],
            [".", "CurrConnections", { stat = "Average" }],
            [".", "Evictions", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Redis Cache Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average" }],
            [".", "RequestCount", { stat = "Sum" }],
            [".", "HTTPCode_Target_4XX_Count", { stat = "Sum" }],
            [".", "HTTPCode_Target_5XX_Count", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Load Balancer Metrics"
        }
      }
    ]
  })
}

# Namespace for monitoring
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
    
    labels = {
      name = "monitoring"
    }
  }
}

# Prometheus Helm Release
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = var.prometheus_chart_version
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  
  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          retention = "${var.prometheus_retention_days}d"
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                accessModes = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "${var.prometheus_storage_size}Gi"
                  }
                }
                storageClassName = var.storage_class
              }
            }
          }
          resources = {
            requests = {
              cpu    = "500m"
              memory = "2Gi"
            }
            limits = {
              cpu    = "2000m"
              memory = "4Gi"
            }
          }
        }
        service = {
          type = "LoadBalancer"
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-internal" = "true"
          }
        }
      }
      
      alertmanager = {
        alertmanagerSpec = {
          storage = {
            volumeClaimTemplate = {
              spec = {
                accessModes = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "10Gi"
                  }
                }
                storageClassName = var.storage_class
              }
            }
          }
        }
        config = {
          global = {
            resolve_timeout = "5m"
          }
          route = {
            group_by = ["alertname", "cluster", "service"]
            group_wait = "10s"
            group_interval = "10s"
            repeat_interval = "12h"
            receiver = "default"
          }
          receivers = [
            {
              name = "default"
              sns_configs = var.alert_sns_topic_arn != "" ? [
                {
                  topic_arn = var.alert_sns_topic_arn
                  region    = var.aws_region
                }
              ] : []
            }
          ]
        }
      }
      
      grafana = {
        enabled = true
        adminPassword = var.grafana_admin_password
        persistence = {
          enabled = true
          size    = "10Gi"
          storageClassName = var.storage_class
        }
        service = {
          type = "LoadBalancer"
          annotations = {
            "service.beta.kubernetes.io/aws-load-balancer-internal" = "false"
          }
        }
        ingress = {
          enabled = var.enable_ingress
          annotations = {
            "kubernetes.io/ingress.class" = "nginx"
            "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
          }
          hosts = var.enable_ingress ? ["grafana.${var.domain_name}"] : []
          tls = var.enable_ingress ? [{
            secretName = "grafana-tls"
            hosts      = ["grafana.${var.domain_name}"]
          }] : []
        }
        datasources = {
          "datasources.yaml" = {
            apiVersion = 1
            datasources = [
              {
                name      = "Prometheus"
                type      = "prometheus"
                url       = "http://prometheus-kube-prometheus-prometheus:9090"
                access    = "proxy"
                isDefault = true
              },
              {
                name   = "CloudWatch"
                type   = "cloudwatch"
                access = "proxy"
                jsonData = {
                  authType      = "default"
                  defaultRegion = var.aws_region
                }
              }
            ]
          }
        }
      }
    })
  ]
  
  set {
    name  = "prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues"
    value = "false"
  }
  
  set {
    name  = "prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues"
    value = "false"
  }
}

# Loki for Log Aggregation
resource "helm_release" "loki" {
  name       = "loki"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "loki-stack"
  version    = var.loki_chart_version
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  
  values = [
    yamlencode({
      loki = {
        persistence = {
          enabled = true
          size    = "${var.loki_storage_size}Gi"
          storageClassName = var.storage_class
        }
        config = {
          auth_enabled = false
          ingester = {
            chunk_idle_period   = "3m"
            chunk_block_size    = 262144
            chunk_retain_period = "1m"
            max_transfer_retries = 0
          }
          limits_config = {
            enforce_metric_name = false
            reject_old_samples  = true
            reject_old_samples_max_age = "168h"
            ingestion_rate_mb   = 10
            ingestion_burst_size_mb = 20
          }
          schema_config = {
            configs = [
              {
                from  = "2020-10-24"
                store = "boltdb-shipper"
                object_store = "filesystem"
                schema = "v11"
                index = {
                  prefix = "index_"
                  period = "24h"
                }
              }
            ]
          }
          server = {
            http_listen_port = 3100
          }
          storage_config = {
            boltdb_shipper = {
              active_index_directory = "/loki/boltdb-shipper-active"
              cache_location        = "/loki/boltdb-shipper-cache"
              cache_ttl            = "24h"
              shared_store         = "filesystem"
            }
            filesystem = {
              directory = "/loki/chunks"
            }
          }
        }
      }
      
      promtail = {
        enabled = true
        config = {
          clients = [
            {
              url = "http://loki:3100/loki/api/v1/push"
            }
          ]
        }
      }
      
      fluent-bit = {
        enabled = false
      }
      
      grafana = {
        enabled = false  # Using the one from kube-prometheus-stack
      }
    })
  ]
}

# CloudWatch Logs Insights Query
resource "aws_cloudwatch_query_definition" "application_errors" {
  name = "${var.project}-${var.environment}-application-errors"
  
  log_group_names = var.log_group_names
  
  query_string = <<EOF
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
EOF
}

# CloudWatch Metrics Alarms
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.project}-${var.environment}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = var.error_rate_threshold
  alarm_description   = "This metric monitors application error rate"
  alarm_actions       = var.alarm_actions
  
  dimensions = {
    LoadBalancer = var.load_balancer_arn_suffix
  }
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "${var.project}-${var.environment}-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = var.response_time_threshold
  alarm_description   = "This metric monitors application response time"
  alarm_actions       = var.alarm_actions
  
  dimensions = {
    LoadBalancer = var.load_balancer_arn_suffix
  }
  
  tags = var.tags
}

# X-Ray Service Map
resource "aws_xray_group" "main" {
  group_name        = "${var.project}-${var.environment}"
  filter_expression = "service(\"${var.project}-*\")"
  
  tags = var.tags
}

resource "aws_xray_sampling_rule" "main" {
  rule_name      = "${var.project}-${var.environment}-sampling"
  priority       = 1000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"
  
  tags = var.tags
}

# Service Monitors for Prometheus
resource "kubernetes_manifest" "service_monitor_validators" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "validators"
      namespace = var.application_namespace
      labels = {
        app = "validators"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          app = "validator"
        }
      }
      endpoints = [
        {
          port     = "metrics"
          interval = "30s"
          path     = "/metrics"
        }
      ]
    }
  }
  
  depends_on = [helm_release.prometheus]
}

resource "kubernetes_manifest" "service_monitor_api" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "api"
      namespace = var.application_namespace
      labels = {
        app = "api"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          app = "api"
        }
      }
      endpoints = [
        {
          port     = "metrics"
          interval = "30s"
          path     = "/metrics"
        }
      ]
    }
  }
  
  depends_on = [helm_release.prometheus]
}

# Custom Grafana Dashboards
resource "kubernetes_config_map" "grafana_dashboards" {
  metadata {
    name      = "custom-dashboards"
    namespace = kubernetes_namespace.monitoring.metadata[0].name
    
    labels = {
      grafana_dashboard = "1"
    }
  }
  
  data = {
    "asi-chain-overview.json" = file("${path.module}/dashboards/asi-chain-overview.json")
    "validator-metrics.json"  = file("${path.module}/dashboards/validator-metrics.json")
    "api-performance.json"    = file("${path.module}/dashboards/api-performance.json")
  }
  
  depends_on = [helm_release.prometheus]
}

# Outputs
output "prometheus_endpoint" {
  value = "http://prometheus-kube-prometheus-prometheus.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:9090"
}

output "grafana_endpoint" {
  value = var.enable_ingress ? "https://grafana.${var.domain_name}" : "Use kubectl port-forward"
}

output "alertmanager_endpoint" {
  value = "http://prometheus-kube-prometheus-alertmanager.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:9093"
}

output "loki_endpoint" {
  value = "http://loki.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local:3100"
}