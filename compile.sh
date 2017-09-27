docker build -t wildapps/mobile:0.0.1 . &&
kubectl scale --replicas=0 deployment deployment --namespace=mobile &&
kubectl scale --replicas=2 deployment deployment --namespace=mobile
