## 使用 istio 部署应用

用 istioctl kube-inject 生成 istio 环境的部署文件

```
istioctl kube-inject -f notebook-istio-deplyment.yaml -o notebook-istio-deployment-injected.yaml
```

参考

- [determining-the-ingress-ip-and-ports](https://istio.io/docs/tasks/traffic-management/ingress/#determining-the-ingress-ip-and-ports)
- [Requirements for Pods and Services](https://istio.io/docs/setup/kubernetes/spec-requirements/)

我们打开 notebook-istio-deployment-injected.yaml 文件, 看 istioctl 注入了:

- Init 容器
- Envoy proxy 容器

## Init 容器

Init 容器用于 Sidecar 容器初始化，设置 iptables 端口转发, 下面是 yaml 文件中的配置

```
initContainers:
- args:
  - -p
  - "15001"
  - -u
  - "1337"
  - -m
  - REDIRECT
  - -i
  - '*'
  - -x
  - ""
  - -b
  - ""
  - -d
  - ""
  image: docker.io/istio/proxy_init:1.0.0
  imagePullPolicy: IfNotPresent
  name: istio-init
```

查看 proxy_init 的 docker file

[Dockerfile.proxy_init](https://github.com/istio/istio/blob/master/pilot/docker/Dockerfile.proxy_init)

里面核心的部分

```
FROM ubuntu:xenial
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    iproute2 \
    iptables \
 && rm -rf /var/lib/apt/lists/*

ADD istio-iptables.sh /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/istio-iptables.sh"]
```

istio-iptables 的脚本文件内容可以查看

[istio-iptables.sh](https://github.com/istio/istio/blob/master/pilot/docker/Dockerfile.proxy_init)

几个参数说明

- -p: Specify the envoy port to which redirect all TCP traffic (default \$ENVOY_PORT = 15001)
- -u: Specify the UID of the user for which the redirection is not applied. Typically, this is the UID of the proxy container, (default to uid of \$ENVOY_USER, uid of istio_proxy, or 1337)
- -m: The mode used to redirect inbound connections to Envoy, either "REDIRECT" or "TPROXY"', (default to \$ISTIO_INBOUND_INTERCEPTION_MODE)
- Using environment variables in \$ISTIO_SIDECAR_CONFIG (default: /var/lib/istio/envoy/sidecar.env)

主要作用就是将容器的所有流量都转发到 Envoy 的 15001 端口

## Envoy proxy

proxy 容器运行 Envoy 代理，下面是 yaml 文件中的配置

```
image: docker.io/istio/proxyv2:1.0.0
imagePullPolicy: IfNotPresent
name: istio-proxy

```

我们看看 proxyv2 的 dockerfile

[Dockerfile.proxyv2](https://github.com/istio/istio/blob/master/pilot/docker/Dockerfile.proxyv2)

dockerfile 最后使用 pilot-agent 来启动 Envoy

```
ENTRYPOINT ["/usr/local/bin/pilot-agent"]
```

pilot-agent 负责的工作

- 生成 envoy 的配置

  ```

  # /etc/istio/proxy/envoy-rev0.json

  docker exec -it <CONTAINER_ID> cat /etc/istio/proxy/envoy-rev0.json

  ```

  部分配置

  ```
  ...
    "tracing": {
      "http": {
        "name": "envoy.zipkin",
        "config": {
          "collector_cluster": "zipkin"
        }
      }
    },

    "stats_sinks": [
      {
        "name": "envoy.statsd",
        "config": {
          "address": {
            "socket_address": {"address": "10.96.163.196", "port_value": 9125}
          }
        }
      }
    ]
    ...
  ```

- 启动 envoy

  ```
  /usr/local/bin/envoy
  ```

  参数文档

  - [pilot-agent 文档](https://istio.io/docs/reference/commands/pilot-agent/)
  - [Envoy 文档](https://www.envoyproxy.io/docs/envoy/latest/operations/cli)

- 监控并管理 envoy 的运行状况

  - [pilot-agent 如何管理 envoy 生命周期](https://segmentfault.com/a/1190000015171622)

## 参考

- [理解 Istio Service Mesh 中 Envoy 代理 Sidecar 注入及流量劫持](http://www.servicemesher.com/blog/envoy-sidecar-injection-in-istio-service-mesh-deep-dive/)
- [istio-traffic-management](https://istio.io/zh/docs/concepts/traffic-management/)

## 配置 istio

部署 istio sidecar injection

```
kubectl apply -f notebook-istio-deployment-injected.yaml
```

查看状态

```
kubectl get services
```

结果

```
NAME TYPE CLUSTER-IP EXTERNAL-IP PORT(S) AGE
nodebook LoadBalancer 10.111.112.133 localhost 3000:32432/TCP 1m
```

访问项目，查看效果

```
curl -i http://localhost/version
HTTP/1.1 404 Not Found
date: Tue, 18 Sep 2018 06:21:54 GMT
server: envoy
content-length: 0
```

## 配置 ingress gateway

Gateway 将 L4-L6 配置与 L7 配置分离, Gateway 只用于配置 L4-L6 功能（例如，对外公开的端口，TLS 配置），然后通过在 Gateway 上绑定 VirtualService 的方式，使用标准的 Istio 规则来控制进入 Gateway 的 HTTP 和 TCP 流量。

![virtualservices-destrules](https://istio.io/blog/2018/v1alpha3-routing/virtualservices-destrules.svg)

Istio Gateway 告诉 k8s 的 istio-ingressgateway pods 可以打开哪些主机和端口，查看这个 pod 的状态

```
kubectl get pod -n istio-system -l istio=ingressgateway
```

部署 gateway

```
kubectl apply -f nodebook-gateway.yaml
```

查看状态

```
kubectl get gateway
```

结果

```
NAME AGE
nodebook-gateway 1m
```

istio 使用 Envoy 来接受并路由转发流量的，Envoy 的 15000 端口用于管理，可以用 kubectl 设置端口转发，然后查看 Envoy

```
# 获取 ingressgateway 的 ClusterIP
kubectl get pod -n istio-system -l istio=ingressgateway
kubectl -n istio-system port-forward istio-ingressgateway-fc648887c-vt2dh 15000
```

访问 Envoy http://localhost:15000/listeners

gateway 在 Istio 的 ingress 网关上开辟了一个端口，当流量到达这个网关时，它还不知道发送到哪里去。

## VirtualService

Istio 使用 VirtualService 配置流量发往何处。

创建 VirtualService

```
istioctl create -f nodebook-service.yaml
istioctl get virtualservices -o yaml
```

创建 DestinationRule

```
istioctl create -f nodebook-rule.yaml
istioctl get destinationrules -o yaml
```

测试

```
curl -i http://localhost/version
HTTP/1.1 200 OK
content-type: text/plain; charset=utf-8
content-length: 2
x-response-time: 0ms
date: Tue, 18 Sep 2018 07:28:47 GMT
x-envoy-upstream-service-time: 1
server: envoy

v3
```

查看 Envoy 上对应的配置 http://localhost:15000/config_dump

查看 nodebook 的 pod name

```
kubectl get pod -l app=nodebook
```

使用 istioctl proxy-config 查看 pod 配置

```
istioctl proxy-config clusters nodebook-v4-55769d7fd6-dp69c | grep nodebook

istioctl proxy-config routes nodebook-v4-55769d7fd6-dp69c --name 3000 -o json

istioctl proxy-config listeners nodebook-v4-55769d7fd6-dp69c

istioctl proxy-config listeners nodebook-v4-55769d7fd6-dp69c --address 0.0.0.0 --port 3000 -o json
```

## istio 测试

测试: 流量切换到 v4

```
istioctl replace -f nodebook-service-v4.yaml
```

查看

```
curl -i http://localhost/version
HTTP/1.1 200 OK
content-type: text/plain; charset=utf-8
content-length: 2
x-response-time: 4ms
date: Tue, 18 Sep 2018 07:33:23 GMT
x-envoy-upstream-service-time: 10
server: envoy

v4
```

测试: 根据 http header 分配流量

```
istioctl replace -f nodebook-service-header.yaml
```

```
curl -i -H "app-ver:v3" http://localhost/version
```

测试: 注入延迟时间

```
istioctl replace -f nodebook-service-delay.yaml
```

```
time curl -i http://localhost/version

time curl -i -H "app-ver:v3" http://localhost/version
```

测试: 注入 http 错误

```
istioctl replace -f nodebook-service-abort.yaml
```

```
curl -i http://localhost/version

curl -i -H "app-ver:v3" http://localhost/version
```

测试: 设置超时，为 v3 设置 1s 超时时间

```
istioctl replace -f nodebook-service-timeout.yaml
```

```
time curl -i http://localhost/delay/2000

time curl -i -H "app-ver:v3" http://localhost/delay/2000
```

测试: 熔断

流量全部切换到 v4，运行压力测试工具

```
wrk -t10 -c100 -d10s http://localhost/version
```

查看请求数

```
curl -i http://localhost/total
```

应用熔断规则

```
kubectl apply -f nodebook-rule-cb.yaml
```

再次运行压力测试工具

```
wrk -t10 -c100 -d10s http://localhost/version

Non-2xx or 3xx responses: xxxx
```

查看请求数

```
curl -i http://localhost/total
```

恢复 destination rule

```
kubectl apply -f nodebook-rule.yaml
```

测试: 流量镜像

```
istioctl replace -f nodebook-service-mirror.yaml
```

查看请求数量

```
curl -i http://localhost/version
curl -i http://localhost/total

curl -i -H "app-ver:v3" http://localhost/version
curl -i -H "app-ver:v3" http://localhost/total
```

发送请求到 v3

```
for i in {1..100}
do
curl -H "app-ver:v3" http://localhost/version
done
```

查看 v3 和 v4 的请求数

```
curl -i http://localhost/total
curl -i -H "app-ver:v3" http://localhost/total
```

配置参考

- [istio.networking](https://istio.io/zh/docs/reference/config/istio.networking.v1alpha3/)
- [Envoy’s load balancing](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/load_balancing.html)

## trace/遥测

设置采样率 [0.0 到 100.0]

- 使用 Helm 选项 pilot.traceSampling 来设置跟踪采样的百分比
- 编辑 istio-pilot 更改环境变量：

```
kubectl -n istio-system edit deploy istio-pilot

# 修改环境变量 PILOT_TRACE_SAMPLING
```

参考文档

- [distributed-tracing](https://preliminary.istio.io/zh/docs/tasks/telemetry/distributed-tracing/)

## Egress

缺省情况下，Istio 服务网格内的 Pod，由于其 iptables 将所有外发流量都转发给了 Sidecar，所以这些集群内的服务无法访问集群之外的服务。

如果要访问外部服务，需要定义 ServiceEntry 来调用外部服务，或者简单的对 Istio 进行配置，要求其直接放行对特定 IP 范围的访问。

## 删除测试项目

```
istioctl delete -f xxx.yaml
```

或者

```
istioctl delete <type> <name> [<name2> ... <nameN>][flags]
```
