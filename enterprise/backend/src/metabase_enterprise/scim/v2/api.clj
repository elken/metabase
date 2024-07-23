(ns metabase-enterprise.scim.v2.api
  "/api/ee/scim/v2/ endpoints. These are the endpoints which implement the SCIM protocol, as opposed to SCIM
  configuration endpoints which are in `metabase-enterprise.scim.api`.

  `v2` in the API path represents the fact that we implement SCIM 2.0."
  (:require
   [compojure.core :refer [GET POST]]
   [metabase.api.common :as api :refer [defendpoint]]
   [metabase.models.user :as user]
   [metabase.util :as u]
   [metabase.util.malli :as mu]
   [metabase.util.malli.schema :as ms]
   [ring.util.codec :as codec]
   [toucan2.core :as t2]))

(def ^:private user-schema-uri "urn:ietf:params:scim:schemas:core:2.0:User")
(def ^:private group-schema-uri "urn:ietf:params:scim:schemas:core:2.0:Group")
(def ^:private list-schema-uri "urn:ietf:params:scim:api:messages:2.0:ListResponse")
(def ^:private error-schema-uri "urn:ietf:params:scim:api:messages:2.0:Error")

(def ^:private default-pagination-limit 100)
(def ^:private default-pagination-offset 0)

(def SCIMUser
  "Malli schema for a SCIM user. This represents both users returned by the service provider (Metabase)
  as well as users sent by the client (i.e. Okta), with fields marked as optional if they may not be present
  in the latter."
  [:map
   [:schemas [:sequential ms/NonBlankString]]
   [:id {:optional true} ms/NonBlankString]
   [:userName ms/NonBlankString]
   [:name [:map
           [:givenName string?]
           [:familyName string?]]]
   [:emails [:sequential
             [:map
              [:value ms/NonBlankString]
              [:type {:optional true} [:enum "work" "home" "other"]]
              [:primary {:optional true} boolean?]]]]
   [:locale {:optional true} ms/NonBlankString]
   [:active {:optional true} boolean?]])

(def SCIMUserList
  "Malli schema for a list of SCIM users"
  [:map
   [:schemas [:sequential ms/NonBlankString]]
   [:totalResults ms/IntGreaterThanOrEqualToZero]
   [:startIndex ms/IntGreaterThanOrEqualToZero]
   [:itemsPerPage ms/IntGreaterThanOrEqualToZero]
   [:Resources [:sequential SCIMUser]]])

(def UserPatch
  "Malli schema for a user patch operation"
  [:map
   [:schemas [:sequential ms/NonBlankString]]
   [:Operations
    [:sequential [:map
                  [:op ms/NonBlankString]
                  [:value [:map
                           [:active ms/BooleanValue]]]]]]])

(def SCIMGroup
  "Malli schema for a SCIM group."
  [:map
   [:schemas [:sequential ms/NonBlankString]]
   [:id {:optional true} ms/NonBlankString]
   [:displayName ms/NonBlankString]
   [:members
    {:optional true}
    [:sequential [:map
                  [:value ms/NonBlankString]
                  [:ref ms/NonBlankString]
                  [:type [:enum "User"]]]]]])

(def SCIMGroupList
  "Malli schema for a list of SCIM groups"
  [:map
   [:schemas [:sequential ms/NonBlankString]]
   [:totalResults ms/IntGreaterThanOrEqualToZero]
   [:startIndex ms/IntGreaterThanOrEqualToZero]
   [:itemsPerPage ms/IntGreaterThanOrEqualToZero]
   [:Resources [:sequential SCIMGroup]]])


;;; +----------------------------------------------------------------------------------------------------------------+
;;; |                                               User operations                                                  |
;;; +----------------------------------------------------------------------------------------------------------------+

(defn- throw-scim-error
  [status message]
  (throw (ex-info message
                  {:schemas     [error-schema-uri]
                   :detail      message
                   :status      status
                   :status-code status})))

(def ^:private user-cols
  "Required columns when fetching users for SCIM."
  [:id :first_name :last_name :email :locale :is_active :entity_id])

(mu/defn ^:private mb-user->scim :- SCIMUser
  "Given a Metabase user, returns a SCIM user."
  [user]
  {:schemas  [user-schema-uri]
   :id       (:entity_id user)
   :userName (:email user)
   :name     {:givenName  (:first_name user)
              :familyName (:last_name user)}
   :emails   [{:value (:email user)}]
   :active   (:is_active user)
   :meta     {:resourceType "User"}})

(mu/defn ^:private scim-user->mb :- user/NewUser
  "Given a SCIM user, returns a Metabase user."
  [user]
  (let [{email :userName name-obj :name locale :locale is-active? :active} user
        {:keys [givenName familyName]} name-obj]
    (merge
     {:first_name givenName
      :last_name  familyName
      :email      email
      :is_active  is-active?
      :type       :personal}
     (when locale {:locale locale}))))

(mu/defn ^:private get-user-by-entity-id
  "Fetches a user by entity ID, or throws a 404"
  [entity-id]
  (or (t2/select-one :model/User :entity_id entity-id
                     {:where [:= :type "personal"]})
      (throw-scim-error 404 "User not found")))

(defn- ^:private user-filter-clause
  [filter-parameter]
  (let [[_ match] (re-matches #"^userName eq \"(.*)\"$" filter-parameter)]
    (if match
      [:= :%lower.email (u/lower-case-en match)]
      (throw-scim-error 400 (format "Unsupported filter parameter: %s" filter-parameter)))))

(defendpoint GET "/Users"
  "Fetch a list of users."
  [:as {{start-index :startIndex c :count filter-param :filter} :params}]
  {start-index  [:maybe ms/IntGreaterThanOrEqualToZero]
   c            [:maybe ms/IntGreaterThanOrEqualToZero]
   filter-param [:maybe ms/NonBlankString]}
  (let [limit          (or c default-pagination-limit)
        offset         (or start-index default-pagination-offset)
        filter-param   (when filter-param (codec/url-decode filter-param))
        where-clause   [:and [:= :type "personal"]
                             (when filter-param (user-filter-clause filter-param))]
        users          (t2/select (cons :model/User user-cols)
                                  {:where    where-clause
                                   :limit    limit
                                   :offset   offset
                                   :order-by [[:id :asc]]})
        results-count  (count users)
        items-per-page (if (< results-count limit) results-count limit)]
    {:schemas      [list-schema-uri]
     :totalResults (t2/count :model/User {:where where-clause})
     :startIndex   offset
     :itemsPerPage items-per-page
     :Resources    (map mb-user->scim users)}))

(defendpoint GET "/Users/:id"
  "Fetch a single user."
  [id]
  {id ms/NonBlankString}
  (-> (get-user-by-entity-id id)
      mb-user->scim))

(defendpoint POST "/Users"
  "Create a single user."
  [:as {scim-user :body}]
  {scim-user SCIMUser}
  (let [mb-user (scim-user->mb scim-user)
        email   (:email mb-user)]
    (when (t2/exists? :model/User :%lower.email (u/lower-case-en email))
      (throw-scim-error 409 "Email address is already in use"))
    (let [new-user (t2/with-transaction [_]
                     (user/insert-new-user! mb-user)
                     (-> (t2/select-one (cons :model/User user-cols)
                                        :email (u/lower-case-en email))
                         mb-user->scim))]
      {:status 201
       :body   new-user})))

(defendpoint PUT "/Users/:id"
  "Update a user."
  [:as {scim-user :body {id :id} :params}]
  {scim-user SCIMUser}
  (let [updates      (scim-user->mb scim-user)
        email        (-> scim-user :emails first :value)
        current-user (get-user-by-entity-id id)]
    (if (not= email (:email current-user))
      (throw-scim-error 400 "You may not update the email of an existing user.")
      (try
       (t2/with-transaction [_conn]
         (t2/update! :model/User (u/the-id current-user) updates)
         (let [user (-> (t2/select-one (cons :model/User user-cols)
                                       :entity_id id)
                        mb-user->scim)]
           {:status 200
            :body   user}))
       (catch Exception e
         (let [message (format "Error updating user: %s" (ex-message e))]
           (throw (ex-info message
                           {:schemas     [error-schema-uri]
                            :detail      message
                            :status      400
                            :status-code 400}))))))))

(defn- active-status
  [patch-op]
  (let [operation (-> patch-op :Operations first)
        op        (:op operation)
        value     (:value operation)]
    (if-not (and (= op "replace")
                 (= (keys value) [:active]))
      (throw-scim-error 400 "Unsupported PATCH operation")
      (get value :active))))

(defendpoint PATCH "/Users/:id"
  "Activate or deactivate a user. Arbitrary patch requests are not currently supported, only activation/deactivation."
  [:as {patch-op :body {id :id} :params}]
  {patch-op UserPatch}
  {id ms/NonBlankString}
  (let [active? (active-status patch-op)
        user    (get-user-by-entity-id id)]
    (t2/update! :model/User :is_active active?)
    (-> user
        mb-user->scim)))

;;; +----------------------------------------------------------------------------------------------------------------+
;;; |                                              Group operations                                                  |
;;; +----------------------------------------------------------------------------------------------------------------+

(mu/defn ^:private mb-group->scim :- SCIMGroup
  "Given a Metabase permissions group, returns a SCIM group."
  [group]
  {:schemas     [group-schema-uri]
   :id          (:entity_id group)
   :displayName (:name group)})

(defn- group-filter-clause
  [filter-parameter]
  (let [[_ match] (re-matches #"^displayName eq \"(.*)\"$" filter-parameter)]
    (if match
      [:= :name match]
      (throw (ex-info "Unsupported filter parameter" {:filter      filter-parameter
                                                      :status-code 400})))))

(defendpoint GET "/Groups"
  "Fetch a list of groups."
  [:as {{start-index :startIndex c :count filter-param :filter} :params}]
  {start-index  [:maybe ms/IntGreaterThanOrEqualToZero]
   c            [:maybe ms/IntGreaterThanOrEqualToZero]
   filter-param [:maybe ms/NonBlankString]}
  (let [limit          (or c default-pagination-limit)
        offset         (or start-index default-pagination-offset)
        filter-param   (when filter-param (codec/url-decode filter-param))
        filter-clause  (if filter-param
                         (group-filter-clause filter-param)
                         [])
        groups         (t2/select [:model/PermissionsGroup :name :entity_id]
                                  {:where    filter-clause
                                   :limit    limit
                                   :offset   offset
                                   :order-by [[:id :asc]]})
        results-count  (count groups)
        items-per-page (if (< results-count limit) results-count limit)]
    {:schemas      [list-schema-uri]
     :totalResults (t2/count :model/PermissionsGroup {:where filter-clause})
     :startIndex   offset
     :itemsPerPage items-per-page
     :Resources    (map mb-group->scim groups)}))

(api/define-routes)
