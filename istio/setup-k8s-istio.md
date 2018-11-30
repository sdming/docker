## kubernetes 安装

安装 kubectl

https://kubernetes.io/docs/tasks/tools/install-kubectl

mac 环境可以使用 brew 安装

```
brew install kubernetes-cli
```

安装 kubernetes

使用 minikube 来安装 kubernetes

- (Minikube 下载)[https://github.com/kubernetes/minikube/releases]
- (minikube 教程文档)[https://kubernetes.io/docs/tutorials/hello-minikube/]

mac 环境可以使用 brew cask 安装

```
brew cask install minikube
minikube start --vm-driver=hyperkit

# The --vm-driver=hyperkit flag specifies that you are using Docker for Mac. The default VM driver is VirtualBox.
```

使用 Docker for mac 安装 kubernetes

- [docker-for-mac](https://docs.docker.com/docker-for-mac/)
- [Docker for mac 常见问题](https://docs.docker.com/docker-for-mac/troubleshoot/#check-the-logs)

如果之前安装过 minikube，需要将 context 切换到 docker-for-desktop 环境

```
kubectl config get-contexts
kubectl config use-context docker-for-desktop
```

## 安装 Istio

使用 Docker for mac 来安装 Istio

安装 Kubernetes dashboard

```
kubectl create -f https://raw.githubusercontent.com/kubernetes/dashboard/master/src/deploy/recommended/kubernetes-dashboard.yaml
```

启动 proxy

```
kubectl proxy
```

访问 kubernetes-dashboard 查看效果

http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/

安装 Helm

```
brew install kubernetes-helm
helm version
```

使用 helm 安装 istio

安装文档 https://istio.io/docs/setup/kubernetes/helm-install/

安装中可能需要科学上网，需要设置命令行代理，比如

```
export http_proxy=http://127.0.0.1:1087;export https_proxy=http://127.0.0.1:1087;
```

先安装 istio 模板

```
kubectl apply -f install/kubernetes/helm/istio/templates/crds.yaml
```

通过 helm 来安装 istio 时默认 tracing 、kiali 、grafana 并不会开启，需要在安装时设置 --set xxx.enabled=true 进行开启，具体安装选项可以查看[installation-options](https://istio.io/docs/reference/config/installation-options/)

```
helm install install/kubernetes/helm/istio --name istio --namespace istio-system \
--set tracing.enabled=true \
--set kiali.enabled=true \
--set grafana.enabled=true
```

开启 Jaeger 网络映射

```
kubectl port-forward -n istio-system $(kubectl get pod -n istio-system -l app=jaeger -o jsonpath='{.items[0].metadata.name}') 16686:16686 &
```

访问 http://127.0.0.1:16686/ 查看效果

开启 Grafana 网络映射

```
kubectl -n istio-system port-forward $(kubectl -n istio-system get pod -l app=grafana -o jsonpath='{.items[0].metadata.name}') 3000:3000 &
```

访问 http://localhost:3000/d/LJ_uJAvmk/istio-service-dashboard?refresh=10s&orgId=1 查看效果

Docker for Mac 提供了一个非常人性的功能——Reset，安装过程出了问题一切就重新开始。
